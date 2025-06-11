const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
    'api', {

        windowControl: {
            minimize: () => ipcRenderer.send('window-minimize'),
            maximize: () => ipcRenderer.send('window-maximize'),
            close: () => ipcRenderer.send('window-close')
        },

        invoke: async (channel, ...data) => {
         
            const validChannels = [
                'get-reminders',
                'save-reminder',
                'delete-reminder'
            ];

            if (validChannels.includes(channel)) {
                try {
                    return await ipcRenderer.invoke(channel, ...data);
                } catch (error) {
                    console.error(`Error invoking ${channel}:`, error);
                    return null;
                }
            }

            console.warn(`Invalid channel: ${channel}`);
            return null;
        },

        receive: (channel, callback) => {
            const validChannels = [
                'show-reminder',
                'show-reminder-fallback'
            ];

            if (validChannels.includes(channel)) {
                ipcRenderer.removeAllListeners(channel);
                ipcRenderer.on(channel, (event, ...args) => callback(...args));
                return true;
            }

            console.warn(`Invalid channel for receive: ${channel}`);
            return false;
        },

        settings: {
            get: async () => {
                try {
                    return await ipcRenderer.invoke('get-settings');
                } catch (error) {
                    console.error('Error getting settings:', error);
                    return {
                        startWithSystem: true,
                        minimizeToTray: true,
                        defaultNotificationDuration: 10,
                        playSoundOnNotification: true,
                        glassmorphismEffect: true
                    };
                }
            },

            save: async (settings) => {
                try {
                    return await ipcRenderer.invoke('save-settings', settings);
                } catch (error) {
                    console.error('Error saving settings:', error);
                    return null;
                }
            },

            reset: async () => {
                try {
                    return await ipcRenderer.invoke('reset-app');
                } catch (error) {
                    console.error('Error resetting app:', error);
                    return false;
                }
            }
        }
    }
);

contextBridge.exposeInMainWorld(
    'utils', {
        formatDate: (date) => {
            try {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            } catch (error) {
                console.error('Error formatting date:', error);
                return '';
            }
        },

        formatTime: (date) => {
            try {
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${hours}:${minutes}`;
            } catch (error) {
                console.error('Error formatting time:', error);
                return '00:00';
            }
        },

        getCurrentDateTime: () => {
            try {
                const now = new Date();
                return {
                    date: now.toISOString().split('T')[0],
                    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                };
            } catch (error) {
                console.error('Error getting current date/time:', error);
                return { date: '', time: '' };
            }
        },

        getDayOfWeek: (date) => {
            try {
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                return days[date.getDay()];
            } catch (error) {
                console.error('Error getting day of week:', error);
                return '';
            }
        },

        getMonthName: (date) => {
            try {
                const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
                return months[date.getMonth()];
            } catch (error) {
                console.error('Error getting month name:', error);
                return '';
            }
        },

        isSameDay: (date1, date2) => {
            try {
                return date1.getFullYear() === date2.getFullYear() &&
                    date1.getMonth() === date2.getMonth() &&
                    date1.getDate() === date2.getDate();
            } catch (error) {
                console.error('Error comparing dates:', error);
                return false;
            }
        },

        getDaysInMonth: (year, month) => {
            try {
                return new Date(year, month + 1, 0).getDate();
            } catch (error) {
                console.error('Error getting days in month:', error);
                return 30;
            }
        },

        formatRecurrencePattern: (reminder) => {
            try {
                if (!reminder.isRecurring) return 'One-time';

                switch (reminder.recurrencePattern) {
                    case 'daily':
                        return 'Every day';

                    case 'weekly':
                        if (reminder.weekdays && reminder.weekdays.length > 0) {
                            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                            const selectedDays = reminder.weekdays.map(day => days[day]);

                            if (reminder.weekdays.length === 7) return 'Every day';
                            if (selectedDays.length === 1) return `Every ${selectedDays[0]}`;
                            if (selectedDays.length === 2) return `Every ${selectedDays[0]} and ${selectedDays[1]}`;

                            const lastDay = selectedDays.pop();
                            return `Every ${selectedDays.join(', ')} and ${lastDay}`;
                        }
                        return 'Weekly';

                    case 'monthly':
                        if (reminder.monthDay) {
                            const day = parseInt(reminder.monthDay);
                            const suffix = ['st', 'nd', 'rd'][((day + 90) % 100 - 10) % 10 - 1] || 'th';
                            return `Monthly on the ${day}${suffix}`;
                        }
                        return 'Monthly';

                    case 'yearly':
                        try {
                            const date = new Date(reminder.date + 'T00:00:00');
                            return `Yearly on ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
                        } catch (e) {
                            return 'Yearly';
                        }

                    default:
                        return 'Recurring';
                }
            } catch (error) {
                console.error('Error formatting recurrence pattern:', error);
                return 'Recurring';
            }
        },

        showFallbackNotification: (title, body) => {
            try {
                if (!("Notification" in window)) return;

                if (Notification.permission === "granted") {
                    new Notification(title, {
                        body: body,
                        icon: './assets/logo.png'
                    });
                } else if (Notification.permission !== "denied") {
                    Notification.requestPermission().then(permission => {
                        if (permission === "granted") {
                            new Notification(title, {
                                body: body,
                                icon: './assets/logo.png'
                            });
                        }
                    });
                }
            } catch (error) {
                console.error('Error showing fallback notification:', error);
            }
        }
    }
);

contextBridge.exposeInMainWorld('appInfo', {
    version: process.env.npm_package_version || '1',
    platform: process.platform
});

window.addEventListener('DOMContentLoaded', () => {
    try {
        const versionElement = document.getElementById('app-version');
        if (versionElement) {
            versionElement.textContent = `GitRemind v${process.env.npm_package_version || '1'}`;
        }
    } catch (error) {
        console.error('Error setting app version:', error);
    }

    if (window.feather) {
        window.feather.replace();
    }
});