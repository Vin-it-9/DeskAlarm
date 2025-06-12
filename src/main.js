const { app, BrowserWindow, ipcMain, Menu, Tray, shell, dialog, Notification, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const AutoLaunch = require('auto-launch');
const isDevelopment = process.env.NODE_ENV === 'development' || !app.isPackaged;

if (process.argv.includes('--disable-gpu')) {
    app.disableHardwareAcceleration();
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    return;
}

let mainWindow;
let tray = null;
let forceQuit = isDevelopment;
let windowPosition = { x: null, y: null };
let reminderCheckInterval = null;
const activeNotifications = new Map();
const userDataPath = app.getPath('userData');
const dataFilePath = path.join(userDataPath, 'reminders.json');
const settingsFilePath = path.join(userDataPath, 'settings.json');

let appSettings = {
    startWithSystem: false,
    minimizeToTray: !isDevelopment,
    defaultNotificationDuration: 10,
    playSoundOnNotification: true,
    glassmorphismEffect: true,
    checkInterval: 5
};

const gitRemindAutoLauncher = new AutoLaunch({
    name: isDevelopment ? 'GitRemind-Dev' : 'GitRemind',
    path: app.getPath('exe')
});

if (isDevelopment) {
    gitRemindAutoLauncher.disable().catch(() => {});
}

function ensureDataDirectory() {
    if (!fs.existsSync(userDataPath)) {
        try {
            fs.mkdirSync(userDataPath, { recursive: true });
        } catch (err) {
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
        const settingsPath = path.join(ensureDataDirectory(), 'settings.json');

        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf8');
            const loadedSettings = JSON.parse(data);
            appSettings = { ...appSettings, ...loadedSettings };
        }

        if (isDevelopment) {
            appSettings.startWithSystem = false;
            if (gitRemindAutoLauncher) {
                gitRemindAutoLauncher.disable().catch(() => {});
            }
        } else if (appSettings.startWithSystem) {
            gitRemindAutoLauncher.enable().catch(() => {});
        } else {
            gitRemindAutoLauncher.disable().catch(() => {});
        }
    } catch (error) {
        if (!isDevelopment) saveSettings();
    }
}

function saveSettings() {
    try {
        const settingsPath = path.join(ensureDataDirectory(), 'settings.json');

        if (isDevelopment) {
            appSettings.startWithSystem = false;
        }

        fs.writeFileSync(settingsPath, JSON.stringify(appSettings, null, 2));
    } catch (error) {}
}

function resolveAssetPath(assetName) {
    const possiblePaths = [
        path.join(__dirname, 'assets', assetName),
        path.join(__dirname, '../assets', assetName),
        path.join(app.getAppPath(), 'assets', assetName)
    ];

    for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
            return testPath;
        }
    }

    return path.join(__dirname, '../assets', assetName);
}

function resolveHtmlPath(htmlFileName) {
    const possiblePaths = [
        path.join(__dirname, htmlFileName),
        path.join(__dirname, 'renderer', htmlFileName),
        path.join(app.getAppPath(), htmlFileName)
    ];

    for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
            return testPath;
        }
    }

    return path.join(__dirname, 'renderer', htmlFileName);
}

function createTray() {
    if (isDevelopment && !appSettings.minimizeToTray) return;

    try {
        const iconPath = resolveAssetPath('logo.png');
        tray = new Tray(iconPath);

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
                label: 'Start with System',
                type: 'checkbox',
                checked: appSettings.startWithSystem,
                enabled: !isDevelopment,
                click: (menuItem) => {
                    if (isDevelopment) {
                        menuItem.checked = false;
                        return;
                    }

                    appSettings.startWithSystem = menuItem.checked;
                    if (menuItem.checked) {
                        gitRemindAutoLauncher.enable().catch(() => {});
                    } else {
                        gitRemindAutoLauncher.disable().catch(() => {});
                    }
                    saveSettings();
                }
            },
            {
                label: 'Minimize to Tray on Close',
                type: 'checkbox',
                checked: appSettings.minimizeToTray,
                enabled: !isDevelopment,
                click: (menuItem) => {
                    if (isDevelopment) {
                        menuItem.checked = false;
                        return;
                    }
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

        tray.setToolTip(isDevelopment ? 'GitRemind (Development)' : 'GitRemind');
        tray.setContextMenu(contextMenu);

        tray.on('double-click', () => {
            if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
            }
        });
    } catch (error) {}
}

function createMainWindow() {
    app.commandLine.appendSwitch('ignore-gpu-blocklist');
    app.commandLine.appendSwitch('disable-gpu-compositing');
    app.commandLine.appendSwitch('disable-gpu-memory-buffer-video-frames');
    app.commandLine.appendSwitch('disable-accelerated-video-decode');
    app.commandLine.appendSwitch('disable-accelerated-video-encode');

    const partitionName = isDevelopment ? 'persist:gitremind-dev' : 'persist:gitremind';

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
            partition: partitionName,
            additionalArguments: ['--disable-http-cache'],
            devTools: isDevelopment
        },
        icon: resolveAssetPath('logo.png')
    });

    mainWindow.setMenu(null);

    if (windowPosition.x === null || windowPosition.y === null) {
        mainWindow.center();
    } else {
        mainWindow.setPosition(windowPosition.x, windowPosition.y);
    }

    const htmlPath = resolveHtmlPath('index.html');
    mainWindow.loadFile(htmlPath);

    mainWindow.on('close', (event) => {
        if (isDevelopment) {
            forceQuit = true;
            clearAllIntervals();
            if (tray) tray.destroy();
            return;
        }

        if (!forceQuit && appSettings.minimizeToTray) {
            event.preventDefault();
            mainWindow.hide();
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
        createMainWindow();
    });

    mainWindow.on('unresponsive', () => {
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

    return mainWindow;
}

function clearAllIntervals() {
    if (reminderCheckInterval) {
        clearInterval(reminderCheckInterval);
        reminderCheckInterval = null;
    }
}

function getReminders() {
    try {
        const reminderPath = path.join(ensureDataDirectory(), 'reminders.json');

        if (!fs.existsSync(reminderPath)) {
            return [];
        }

        const data = fs.readFileSync(reminderPath);
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function saveReminders(reminders) {
    try {
        const reminderPath = path.join(ensureDataDirectory(), 'reminders.json');
        fs.writeFileSync(reminderPath, JSON.stringify(reminders, null, 2));
        return true;
    } catch (error) {
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
    } catch (error) {}
}

function showNotification(reminder) {
    try {
        if (activeNotifications.has(reminder.id)) {
            const existingNotification = activeNotifications.get(reminder.id);
            existingNotification.close();
            activeNotifications.delete(reminder.id);
        }

        const iconPath = resolveAssetPath('icon.png');

        const notification = new Notification({
            title: reminder.title,
            body: reminder.description || '',
            icon: iconPath,
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

            if (isDevelopment) {
                settings.startWithSystem = false;
            }

            appSettings = { ...appSettings, ...settings };
            saveSettings();

            if (!isDevelopment && settings.hasOwnProperty('startWithSystem')) {
                if (settings.startWithSystem) {
                    gitRemindAutoLauncher.enable().catch(() => {});
                } else {
                    gitRemindAutoLauncher.disable().catch(() => {});
                }
            }

            if (updateTimer) {
                clearAllIntervals();
                const checkIntervalMs = (appSettings.checkInterval || 5) * 1000;
                reminderCheckInterval = setInterval(checkReminders, checkIntervalMs);
            }

            return appSettings;
        } catch (error) {
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

            gitRemindAutoLauncher.disable().catch(() => {});

            app.relaunch();
            app.exit();
            return true;
        } catch (error) {
            return false;
        }
    });

    ipcMain.handle('remove-from-startup', () => {
        try {
            gitRemindAutoLauncher.disable().catch(() => {});
            appSettings.startWithSystem = false;
            saveSettings();
            return true;
        } catch (error) {
            return false;
        }
    });
}

function cleanupOnExit() {
    clearAllIntervals();

    activeNotifications.forEach((notification, id) => {
        notification.close();
    });
    activeNotifications.clear();

    if (tray) {
        tray.destroy();
        tray = null;
    }

    if (isDevelopment) {
        gitRemindAutoLauncher.disable().catch(() => {});
    }
}

app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    }
});

app.whenReady().then(() => {
    try {
        if (isDevelopment) {
            gitRemindAutoLauncher.disable().catch(() => {});
        }

        process.on('uncaughtException', (error) => {
            if (mainWindow) {
                dialog.showMessageBox(mainWindow, {
                    type: 'error',
                    title: 'Application Error',
                    message: 'An unexpected error occurred',
                    detail: error.toString(),
                    buttons: ['OK']
                }).catch(() => {});
            }
        });

        loadSettings();

        if (!isDevelopment || appSettings.minimizeToTray) {
            createTray();
        }

        createMainWindow();
        setupIPC();

        const checkIntervalMs = (appSettings.checkInterval || 5) * 1000;
        reminderCheckInterval = setInterval(checkReminders, checkIntervalMs);
        setTimeout(checkReminders, 1000);
    } catch (error) {
        dialog.showErrorBox(
            'GitRemind Startup Error',
            `An error occurred during startup: ${error.message}`
        );
    }
});

app.on('window-all-closed', () => {
    if (isDevelopment || !appSettings.minimizeToTray) {
        cleanupOnExit();
        app.quit();
    }
});

app.on('before-quit', () => {
    forceQuit = true;
    cleanupOnExit();
});

app.on('will-quit', () => {
    if (isDevelopment) {
        gitRemindAutoLauncher.disable().catch(() => {});
    }
});

app.on('quit', () => {
    if (isDevelopment) {
        const { exec } = require('child_process');
        try {
            exec('taskkill /F /IM electron.exe /T', () => {});
        } catch (e) {}
    }
});