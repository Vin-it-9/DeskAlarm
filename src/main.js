const { app, BrowserWindow, ipcMain, Menu, Tray, shell, dialog, Notification, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const AutoLaunch = require('auto-launch');

let mainWindow;
let tray;
let forceQuit = false;
let windowPosition = { x: null, y: null };
const dataFilePath = path.join(app.getPath('userData'), 'reminders.json');
const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');
const activeNotifications = new Map();

let appSettings = {
    startWithSystem: true,
    minimizeToTray: true,
    defaultNotificationDuration: 10,
    playSoundOnNotification: true,
    glassmorphismEffect: true,
    checkInterval: 5
};

const gitRemindAutoLauncher = new AutoLaunch({
    name: 'GitRemind',
    path: app.getPath('exe'),
});

function ensureDataDirectory() {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
        try {
            fs.mkdirSync(userDataPath, { recursive: true });
        } catch (err) {
            console.error('Failed to create user data directory:', err);
            const fallbackPath = path.join(app.getPath('documents'), 'GitRemind');
            if (!fs.existsSync(fallbackPath)) {
                fs.mkdirSync(fallbackPath, { recursive: true });
            }
            return fallbackPath;
        }
    }
    return userDataPath;
}

function loadSettings() {
    try {
        const userDataPath = ensureDataDirectory();
        const settingsPath = path.join(userDataPath, 'settings.json');

        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf8');
            const loadedSettings = JSON.parse(data);
            appSettings = { ...appSettings, ...loadedSettings };
        } else {
            saveSettings();
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }

    if (appSettings.startWithSystem) {
        gitRemindAutoLauncher.enable().catch(err => console.error('Auto-launch error:', err));
    } else {
        gitRemindAutoLauncher.disable().catch(err => console.error('Auto-launch disable error:', err));
    }
}

function saveSettings() {
    try {
        const userDataPath = ensureDataDirectory();
        const settingsPath = path.join(userDataPath, 'settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify(appSettings, null, 2));
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

function createMainWindow() {
    app.commandLine.appendSwitch('ignore-gpu-blocklist');
    app.commandLine.appendSwitch('disable-gpu-compositing');
    app.commandLine.appendSwitch('disable-gpu-memory-buffer-video-frames');
    app.commandLine.appendSwitch('disable-accelerated-video-decode');
    app.commandLine.appendSwitch('disable-accelerated-video-encode');

    if (process.argv.includes('--disable-gpu')) {
        app.disableHardwareAcceleration();
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        frame: true,
        backgroundColor: '#0d1117',
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            partition: 'persist:gitremind',
            additionalArguments: ['--disable-http-cache']
        },
        icon: path.join(__dirname, '../assets/logo.png')
    });

    mainWindow.setMenu(null);

    if (windowPosition.x === null || windowPosition.y === null) {
        mainWindow.center();
    } else {
        mainWindow.setPosition(windowPosition.x, windowPosition.y);
    }

    mainWindow.loadFile('src/renderer/index.html');

    mainWindow.on('close', (event) => {
        if (!forceQuit && appSettings.minimizeToTray) {
            event.preventDefault();
            mainWindow.hide();
            if (!app.getLoginItemSettings().wasOpenedAtLogin) {
                tray.displayBalloon({
                    title: 'GitRemind is still running',
                    content: 'The app is now minimized to the system tray. Right-click the tray icon for options.'
                });
            }
            return false;
        }
    });

    mainWindow.on('moved', () => {
        const position = mainWindow.getPosition();
        windowPosition = { x: position[0], y: position[1] };
    });

    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.webContents.on('crashed', () => {
        console.error('Renderer process crashed. Restarting window...');
        createMainWindow();
    });

    mainWindow.on('unresponsive', () => {
        console.error('Window became unresponsive');
        dialog.showMessageBox({
            type: 'warning',
            title: 'Application Not Responding',
            message: 'GitRemind is not responding. Would you like to restart it?',
            buttons: ['Wait', 'Restart'],
            defaultId: 1
        }).then(result => {
            if (result.response === 1) {
                app.relaunch();
                app.exit(0);
            }
        });
    });

    createTray();
    const checkIntervalMs = (appSettings.checkInterval || 5) * 1000;
    setInterval(checkReminders, checkIntervalMs);
    setTimeout(checkReminders, 1000);
}

function createTray() {
    try {
        tray = new Tray(path.join(__dirname, '../assets/logo.png'));
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Open GitRemind',
                click: () => {
                    if (mainWindow) {
                        mainWindow.show();
                        mainWindow.focus();
                    }
                }
            },
            {
                label: 'Check Reminders Now',
                click: () => checkReminders()
            },
            { type: 'separator' },
            {
                label: 'Start on System Boot',
                type: 'checkbox',
                checked: appSettings.startWithSystem,
                click: (menuItem) => {
                    appSettings.startWithSystem = menuItem.checked;
                    if (menuItem.checked) {
                        gitRemindAutoLauncher.enable().catch(err => console.error('Auto-launch error:', err));
                    } else {
                        gitRemindAutoLauncher.disable().catch(err => console.error('Auto-launch disable error:', err));
                    }
                    saveSettings();
                }
            },
            {
                label: 'Minimize to Tray on Close',
                type: 'checkbox',
                checked: appSettings.minimizeToTray,
                click: (menuItem) => {
                    appSettings.minimizeToTray = menuItem.checked;
                    saveSettings();
                }
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => {
                    forceQuit = true;
                    app.quit();
                }
            }
        ]);

        tray.setToolTip('GitRemind');
        tray.setContextMenu(contextMenu);
        tray.on('double-click', () => {
            if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
            }
        });
    } catch (error) {
        console.error('Error creating tray:', error);
    }
}

function getReminders() {
    try {
        const userDataPath = ensureDataDirectory();
        const reminderPath = path.join(userDataPath, 'reminders.json');

        if (!fs.existsSync(reminderPath)) {
            return [];
        }
        const data = fs.readFileSync(reminderPath);
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading reminders:', error);
        return [];
    }
}

function saveReminders(reminders) {
    try {
        const userDataPath = ensureDataDirectory();
        const reminderPath = path.join(userDataPath, 'reminders.json');

        fs.writeFileSync(reminderPath, JSON.stringify(reminders, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving reminders:', error);
        return false;
    }
}

function generateRecurringOccurrences(reminder) {
    if (!reminder.isRecurring) return [reminder];

    const occurrences = [];
    const baseDate = new Date(reminder.date + 'T' + reminder.time);
    const now = new Date();
    let occurrence = new Date(baseDate);
    let count = 0;
    const maxOccurrences = 20;

    let endDate = null;
    if (reminder.recurrenceEnd === 'on-date' && reminder.endDate) {
        endDate = new Date(reminder.endDate + 'T23:59:59');
    } else if (reminder.recurrenceEnd === 'after' && reminder.occurrences) {
    } else {
        endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
    }

    while (
        (reminder.recurrenceEnd !== 'after' || count < reminder.occurrences) &&
        (count < maxOccurrences) &&
        (!endDate || occurrence <= endDate)
        ) {
        if (count > 0 || occurrence >= now || (occurrence >= new Date(now - 60000))) {
            const newOccurrence = {
                ...reminder,
                date: occurrence.toISOString().split('T')[0],
                time: occurrence.toTimeString().slice(0, 5),
                originalId: reminder.id,
                isGeneratedOccurrence: count > 0,
                id: reminder.id + '-' + count,
                notified: occurrence < now
            };
            occurrences.push(newOccurrence);
        }

        count++;
        occurrence = getNextOccurrence(occurrence, reminder);
    }

    return occurrences;
}

function getNextOccurrence(date, reminder) {
    const next = new Date(date);

    switch (reminder.recurrencePattern) {
        case 'daily':
            next.setDate(next.getDate() + 1);
            break;

        case 'weekly':

            if (reminder.weekdays && reminder.weekdays.length > 0) {
                const currentDay = next.getDay();
                let daysToAdd = 1;
                let nextDay = (currentDay + daysToAdd) % 7;
                while (!reminder.weekdays.includes(nextDay) && daysToAdd < 7) {
                    daysToAdd++;
                    nextDay = (currentDay + daysToAdd) % 7;
                }
                next.setDate(next.getDate() + daysToAdd);
            } else {
                next.setDate(next.getDate() + 7);
            }
            break;

        case 'monthly':
            if (reminder.monthDay) {
                next.setMonth(next.getMonth() + 1);
                const targetDay = parseInt(reminder.monthDay);
                const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
                next.setDate(Math.min(targetDay, lastDayOfMonth));
            } else {
                next.setMonth(next.getMonth() + 1);
            }
            break;
        case 'yearly':
            next.setFullYear(next.getFullYear() + 1);
            break;
        default:
            next.setDate(next.getDate() + 1);
    }

    return next;
}

function checkReminders() {
    try {
        const reminders = getReminders();
        if (reminders.length === 0) return;

        const now = new Date();
        const processed = new Set();
        let anyNotified = false;

        for (const reminder of reminders) {
            if (processed.has(reminder.id)) continue;
            let reminderInstances = [reminder];
            if (reminder.isRecurring) {
                reminderInstances = generateRecurringOccurrences(reminder);
            }
            for (const instance of reminderInstances) {
                const reminderTime = new Date(instance.date + 'T' + instance.time);
                const checkIntervalMs = (appSettings.checkInterval || 5) * 1000;
                if (reminderTime <= now &&
                    reminderTime >= new Date(now - checkIntervalMs) &&
                    !instance.notified) {

                    console.log(`Showing notification for: ${instance.title} (${reminderTime.toLocaleTimeString()})`);
                    showNotification(instance);
                    anyNotified = true;
                    const index = reminders.findIndex(r => r.id === reminder.id);
                    if (index !== -1) {
                        reminders[index].notified = true;
                    }
                    processed.add(instance.id);
                    processed.add(reminder.id);
                }
            }
        }

        if (anyNotified) {
            saveReminders(reminders);
        }
    } catch (error) {
        console.error('Error checking reminders:', error);
    }
}

function showNotification(reminder) {
    try {
        if (activeNotifications.has(reminder.id)) {
            const existingNotification = activeNotifications.get(reminder.id);
            existingNotification.close();
            activeNotifications.delete(reminder.id);
        }
        const notification = new Notification({
            title: reminder.title,
            body: reminder.description || '',
            icon: path.join(__dirname, 'assets/icon.png'),
            silent: !appSettings.playSoundOnNotification,
            timeoutType: 'never'
        });

        activeNotifications.set(reminder.id, notification);
        notification.show();

        if (appSettings.playSoundOnNotification) {
            shell.beep();
        }

        notification.on('click', () => {
            if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
                mainWindow.webContents.send('show-reminder', reminder.id);
            }
            notification.close();
        });

        notification.on('close', () => {
            activeNotifications.delete(reminder.id);
        });

        const duration = reminder.notificationDuration ||
            appSettings.defaultNotificationDuration ||
            10;

        setTimeout(() => {
            if (activeNotifications.has(reminder.id)) {
                notification.close();
                activeNotifications.delete(reminder.id);
            }
        }, duration * 1000);
    } catch (error) {
        console.error('Error showing notification:', error);
        if (mainWindow) {
            mainWindow.webContents.send('show-reminder-fallback', reminder);
        }
    }
}

function setupIPC() {
    ipcMain.on('window-minimize', () => {
        if (mainWindow) mainWindow.minimize();
    });

    ipcMain.on('window-maximize', () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
        }
    });

    ipcMain.on('window-close', () => {
        if (mainWindow) {
            mainWindow.close();
        }
    });

    ipcMain.handle('get-reminders', () => {
        return getReminders();
    });

    ipcMain.handle('save-reminder', (event, reminder) => {
        try {
            let reminders = getReminders();
            if (reminder.isRecurring && reminder.recurrencePattern === 'weekly') {
                reminder.weekdays = [];
                for (let i = 0; i < 7; i++) {
                    if (reminder[`weekday_${i}`]) {
                        reminder.weekdays.push(i);
                        delete reminder[`weekday_${i}`];
                    }
                }
            }
            if (!reminder.id) {
                reminder.id = Date.now().toString();
                reminders.push(reminder);
            } else {
                const index = reminders.findIndex(r => r.id === reminder.id);
                if (index !== -1) {
                    reminders[index] = reminder;
                } else {
                    reminders.push(reminder);
                }
            }

            saveReminders(reminders);
            return reminder;
        } catch (error) {
            console.error('Error saving reminder:', error);
            return null;
        }
    });

    ipcMain.handle('delete-reminder', (event, reminderId) => {
        try {
            let reminders = getReminders();
            reminders = reminders.filter(r => r.id !== reminderId);
            saveReminders(reminders);
            return true;
        } catch (error) {
            console.error('Error deleting reminder:', error);
            return false;
        }
    });

    ipcMain.handle('get-settings', () => {
        return appSettings;
    });

    ipcMain.handle('save-settings', (event, settings) => {
        try {
            let updateTimer = false;
            if (settings.checkInterval !== undefined &&
                settings.checkInterval !== appSettings.checkInterval) {
                updateTimer = true;
            }

            appSettings = { ...appSettings, ...settings };
            saveSettings();
            if (settings.hasOwnProperty('startWithSystem')) {
                if (settings.startWithSystem) {
                    gitRemindAutoLauncher.enable().catch(err => console.error('Auto-launch error:', err));
                } else {
                    gitRemindAutoLauncher.disable().catch(err => console.error('Auto-launch disable error:', err));
                }
            }

            if (updateTimer) {
                for (let i = 1; i < 10000; i++) {
                    clearInterval(i);
                }
                const checkIntervalMs = (appSettings.checkInterval || 5) * 1000;
                setInterval(checkReminders, checkIntervalMs);
            }

            return appSettings;
        } catch (error) {
            console.error('Error saving settings:', error);
            return appSettings;
        }
    });

    ipcMain.handle('reset-app', () => {
        try {
            const userDataPath = ensureDataDirectory();
            const reminderPath = path.join(userDataPath, 'reminders.json');
            const settingsPath = path.join(userDataPath, 'settings.json');

            if (fs.existsSync(reminderPath)) {
                fs.unlinkSync(reminderPath);
            }

            if (fs.existsSync(settingsPath)) {
                fs.unlinkSync(settingsPath);
            }

            appSettings = {
                startWithSystem: true,
                minimizeToTray: true,
                defaultNotificationDuration: 10,
                playSoundOnNotification: true,
                glassmorphismEffect: true,
                checkInterval: 5
            };
            app.relaunch();
            app.exit();
            return true;
        } catch (error) {
            console.error('Error resetting app:', error);
            return false;
        }
    });
}

function setupErrorHandlers() {
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        try {
            if (mainWindow) {
                dialog.showMessageBox(mainWindow, {
                    type: 'error',
                    title: 'Application Error',
                    message: 'An unexpected error occurred',
                    detail: error.toString(),
                    buttons: ['OK']
                });
            }
        } catch (dialogError) {
            console.error('Failed to show error dialog:', dialogError);
        }
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection:', reason);
    });
}

app.whenReady().then(() => {
    try {
        setupErrorHandlers();
        app.allowRendererProcessReuse = true;
        app.setPath('userData', ensureDataDirectory());

        loadSettings();
        createMainWindow();
        setupIPC();
    } catch (error) {
        console.error('Error during app initialization:', error);
        dialog.showErrorBox(
            'GitRemind Startup Error',
            `An error occurred during startup: ${error.message}\n\nThe application may not function correctly.`
        );
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        } else if (mainWindow) {
            mainWindow.show();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && !appSettings.minimizeToTray) {
        app.quit();
    }
});

app.on('before-quit', () => {
    forceQuit = true;
    activeNotifications.forEach((notification, id) => {
        notification.close();
    });
    activeNotifications.clear();
});