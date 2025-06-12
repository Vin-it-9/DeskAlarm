const { contextBridge, ipcRenderer } = require('electron');
const isDevelopment = process.env.NODE_ENV === 'development';

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
                'delete-reminder',
                'get-settings',
                'save-settings',
                'reset-app',
                'remove-from-startup',
                'schedule-progressive-notification',
                'cancel-notification',
                'check-channel-exists'
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
                'show-reminder-fallback',
                'update-status'
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
        },

        removeFromStartup: async () => {
            try {
                return await ipcRenderer.invoke('remove-from-startup');
            } catch (error) {
                console.error('Error removing from startup:', error);
                return false;
            }
        },

        scheduleProgressiveNotification: async (reminder) => {
            try {
                return await ipcRenderer.invoke('schedule-progressive-notification', reminder);
            } catch (error) {
                console.error('Error scheduling progressive notification:', error);
                return false;
            }
        },

        notifications: {
            schedule: async (reminder, options = {}) => {
                try {
                    return await ipcRenderer.invoke('schedule-progressive-notification', {
                        ...reminder,
                        isProgressiveNotification: options.progressive || false
                    });
                } catch (error) {
                    console.error('Error scheduling notification:', error);
                    return false;
                }
            },
            cancel: async (id) => {
                try {
                    return await ipcRenderer.invoke('cancel-notification', id);
                } catch (error) {
                    console.error('Error canceling notification:', error);
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
                if (!date || !(date instanceof Date)) {
                    return '';
                }
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
                if (!date || !(date instanceof Date)) {
                    return '00:00';
                }
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${hours}:${minutes}`;
            } catch (error) {
                console.error('Error formatting time:', error);
                return '00:00';
            }
        },

        formatDisplayTime: (timeString) => {
            try {
                if (!timeString) return '';

                const [hours, minutes] = timeString.split(':');
                const hour = parseInt(hours, 10);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const hour12 = hour % 12 || 12;
                return `${hour12}:${minutes} ${ampm}`;
            } catch (error) {
                console.error('Error formatting display time:', error);
                return timeString || '';
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
                if (!date || !(date instanceof Date)) {
                    return '';
                }
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                return days[date.getDay()];
            } catch (error) {
                console.error('Error getting day of week:', error);
                return '';
            }
        },

        getShortDayOfWeek: (date) => {
            try {
                if (!date || !(date instanceof Date)) {
                    return '';
                }
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                return days[date.getDay()];
            } catch (error) {
                console.error('Error getting short day of week:', error);
                return '';
            }
        },

        getMonthName: (date) => {
            try {
                if (!date || !(date instanceof Date)) {
                    return '';
                }
                const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
                return months[date.getMonth()];
            } catch (error) {
                console.error('Error getting month name:', error);
                return '';
            }
        },

        getShortMonthName: (date) => {
            try {
                if (!date || !(date instanceof Date)) {
                    return '';
                }
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return months[date.getMonth()];
            } catch (error) {
                console.error('Error getting short month name:', error);
                return '';
            }
        },

        isSameDay: (date1, date2) => {
            try {
                if (!date1 || !date2 || !(date1 instanceof Date) || !(date2 instanceof Date)) {
                    return false;
                }
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

        parseDate: (dateString) => {
            try {
                if (!dateString) return null;
                const parts = dateString.includes('-')
                    ? dateString.split('-').map(p => parseInt(p, 10))
                    : dateString.split('/').map(p => parseInt(p, 10));

                if (parts.length !== 3) return null;

                if (dateString.includes('-')) {
                    return new Date(parts[0], parts[1] - 1, parts[2]);
                } else {
                    return new Date(parts[2], parts[0] - 1, parts[1]);
                }
            } catch (error) {
                console.error('Error parsing date:', error);
                return null;
            }
        },

        formatRecurrencePattern: (reminder) => {
            try {
                if (!reminder || !reminder.isRecurring) return 'One-time';

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
                            let suffix;
                            if (day === 1 || day === 21 || day === 31) suffix = 'st';
                            else if (day === 2 || day === 22) suffix = 'nd';
                            else if (day === 3 || day === 23) suffix = 'rd';
                            else suffix = 'th';
                            return `Monthly on ${day}${suffix}`;
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

        getReminderTypeDetails: (type) => {
            try {
                const types = {
                    meeting: { icon: 'users', class: 'type-meeting', label: 'Meeting', color: '#3fb950' },
                    deadline: { icon: 'alert-triangle', class: 'type-deadline', label: 'Deadline', color: '#f85149' },
                    personal: { icon: 'heart', class: 'type-personal', label: 'Personal', color: '#ff7b72' },
                    leetcode: { icon: 'code', class: 'type-leetcode', label: 'LeetCode', color: '#ffa116' },
                    codechef: { icon: 'award', class: 'type-codechef', label: 'CodeChef', color: '#764abc' },
                    codeforces: { icon: 'flag', class: 'type-codeforces', label: 'CodeForces', color: '#1c86ee' },
                    gfg: { icon: 'book', class: 'type-gfg', label: 'GeeksForGeeks', color: '#2ecc71' },
                    coding: { icon: 'terminal', class: 'type-coding', label: 'Coding', color: '#3498db' },
                    other: { icon: 'bell', class: 'type-other', label: 'Other', color: '#8b949e' }
                };

                return types[type] || types.other;
            } catch (error) {
                console.error('Error getting reminder type details:', error);
                return { icon: 'bell', class: 'type-other', label: 'Other', color: '#8b949e' };
            }
        },

        showFallbackNotification: (title, body) => {
            try {
                if (!("Notification" in window)) return;

                if (Notification.permission === "granted") {
                    new Notification(title, {
                        body: body,
                        icon: '../assets/logo.png'
                    });
                } else if (Notification.permission !== "denied") {
                    Notification.requestPermission().then(permission => {
                        if (permission === "granted") {
                            new Notification(title, {
                                body: body,
                                icon: '../assets/logo.png'
                            });
                        }
                    });
                }
            } catch (error) {
                console.error('Error showing fallback notification:', error);
            }
        },

        formatDisplayDate: (date) => {
            try {
                if (typeof date === 'string') {
                    date = new Date(date);
                }

                if (!date || isNaN(date.getTime())) {
                    return '';
                }

                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                return date.toLocaleDateString('en-US', options);
            } catch (error) {
                console.error('Error formatting display date:', error);
                return '';
            }
        },

        formatRelativeDate: (date) => {
            try {
                if (typeof date === 'string') {
                    date = new Date(date);
                }

                if (!date || isNaN(date.getTime())) {
                    return '';
                }

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                const dateToCheck = new Date(date);
                dateToCheck.setHours(0, 0, 0, 0);

                if (dateToCheck.getTime() === today.getTime()) {
                    return 'Today';
                } else if (dateToCheck.getTime() === tomorrow.getTime()) {
                    return 'Tomorrow';
                } else if (dateToCheck.getTime() === yesterday.getTime()) {
                    return 'Yesterday';
                }
                const daysUntil = Math.round((dateToCheck - today) / (1000 * 60 * 60 * 24));
                if (daysUntil > 0 && daysUntil < 7) {
                    return date.toLocaleDateString('en-US', { weekday: 'long' });
                }
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: today.getFullYear() !== date.getFullYear() ? 'numeric' : undefined
                });
            } catch (error) {
                console.error('Error formatting relative date:', error);
                return '';
            }
        },

        isToday: (date) => {
            try {
                if (typeof date === 'string') {
                    date = new Date(date);
                }

                if (!date || isNaN(date.getTime())) {
                    return false;
                }

                const today = new Date();
                return date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();
            } catch (error) {
                console.error('Error checking if date is today:', error);
                return false;
            }
        },

        isTomorrow: (date) => {
            try {
                if (typeof date === 'string') {
                    date = new Date(date);
                }

                if (!date || isNaN(date.getTime())) {
                    return false;
                }

                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);

                return date.getDate() === tomorrow.getDate() &&
                    date.getMonth() === tomorrow.getMonth() &&
                    date.getFullYear() === tomorrow.getFullYear();
            } catch (error) {
                console.error('Error checking if date is tomorrow:', error);
                return false;
            }
        },

        isValidDate: (date) => {
            if (!date) return false;
            if (date instanceof Date) return !isNaN(date.getTime());

            try {
                const d = new Date(date);
                return !isNaN(d.getTime());
            } catch (e) {
                return false;
            }
        },

        getTimeAgo: (date) => {
            try {
                if (!date) return '';

                const now = new Date();
                const past = typeof date === 'string' ? new Date(date) : date;
                const diffMs = now - past;

                if (diffMs < 0) return 'in the future';

                const diffSecs = Math.floor(diffMs / 1000);
                if (diffSecs < 60) return `${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`;

                const diffMins = Math.floor(diffSecs / 60);
                if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;

                const diffHours = Math.floor(diffMins / 60);
                if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;

                const diffDays = Math.floor(diffHours / 24);
                if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

                const diffWeeks = Math.floor(diffDays / 7);
                if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;

                const diffMonths = Math.floor(diffDays / 30);
                if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;

                const diffYears = Math.floor(diffDays / 365);
                return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
            } catch (error) {
                console.error('Error calculating time ago:', error);
                return '';
            }
        }
    }
);

contextBridge.exposeInMainWorld('appInfo', {
    version: process.env.npm_package_version || '1.0.0',
    platform: process.platform,
    isWindows: process.platform === 'win32',
    isMac: process.platform === 'darwin',
    isLinux: process.platform === 'linux',
    isDevelopment: isDevelopment,
    currentDate: new Date().toISOString().split('T')[0],
    currentTime: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
    timestamp: Date.now()
});

const animationHelper = {
    addAnimation: (element, animationClass, duration = 300) => {
        if (!element) return Promise.resolve();

        element.classList.add(animationClass);
        return new Promise(resolve => {
            setTimeout(() => {
                element.classList.remove(animationClass);
                resolve();
            }, duration);
        });
    },

    fadeIn: (element, duration = 300) => {
        if (!element) return Promise.resolve();

        element.style.opacity = '0';
        element.classList.remove('hidden');

        return new Promise(resolve => {
            requestAnimationFrame(() => {
                element.style.transition = `opacity ${duration}ms ease`;
                element.style.opacity = '1';

                setTimeout(() => {
                    element.style.transition = '';
                    resolve();
                }, duration);
            });
        });
    },

    fadeOut: (element, duration = 300) => {
        if (!element) return Promise.resolve();
        if (getComputedStyle(element).display === 'none') return Promise.resolve();

        element.style.transition = `opacity ${duration}ms ease`;
        element.style.opacity = '0';

        return new Promise(resolve => {
            setTimeout(() => {
                element.classList.add('hidden');
                element.style.transition = '';
                resolve();
            }, duration);
        });
    },

    slideUp: (element, duration = 300) => {
        if (!element) return Promise.resolve();

        const height = element.offsetHeight;
        element.style.height = `${height}px`;
        element.style.overflow = 'hidden';

        return new Promise(resolve => {
            requestAnimationFrame(() => {
                element.style.transition = `height ${duration}ms ease`;
                element.style.height = '0px';

                setTimeout(() => {
                    element.style.display = 'none';
                    element.style.height = '';
                    element.style.overflow = '';
                    element.style.transition = '';
                    resolve();
                }, duration);
            });
        });
    },

    slideDown: (element, duration = 300) => {
        if (!element) return Promise.resolve();
        const originalDisplay = window.getComputedStyle(element).display === 'none' ? 'block' : window.getComputedStyle(element).display;
        element.style.display = originalDisplay;
        element.style.overflow = 'hidden';
        element.style.height = '0px';
        const height = element.scrollHeight;

        return new Promise(resolve => {
            requestAnimationFrame(() => {
                element.style.transition = `height ${duration}ms ease`;
                element.style.height = `${height}px`;

                setTimeout(() => {
                    element.style.height = '';
                    element.style.overflow = '';
                    element.style.transition = '';
                    resolve();
                }, duration);
            });
        });
    },

    shake: (element, duration = 500) => {
        if (!element) return Promise.resolve();

        return animationHelper.addAnimation(element, 'animate-shake', duration);
    },

    pulse: (element, duration = 1000) => {
        if (!element) return Promise.resolve();

        return animationHelper.addAnimation(element, 'animate-pulse', duration);
    },

    highlight: (element, duration = 1500) => {
        if (!element) return Promise.resolve();

        element.style.transition = `background-color ${duration}ms ease`;
        element.style.backgroundColor = 'rgba(88, 166, 255, 0.2)';

        return new Promise(resolve => {
            setTimeout(() => {
                element.style.backgroundColor = '';
                setTimeout(() => {
                    element.style.transition = '';
                    resolve();
                }, 100);
            }, duration);
        });
    }
};

contextBridge.exposeInMainWorld('animations', animationHelper);

contextBridge.exposeInMainWorld('domUtils', {
    selectElementContents: (element) => {
        if (!element) return;

        const range = document.createRange();
        range.selectNodeContents(element);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    },

    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy text: ', err);
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        }
    },

    focusElement: (selector, delay = 0) => {
        setTimeout(() => {
            const element = document.querySelector(selector);
            if (element) {
                element.focus();
                if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
                    element.select();
                }
            }
        }, delay);
    },

    scrollIntoView: (selector, options = { behavior: 'smooth', block: 'start' }) => {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollIntoView(options);
        }
    }
});

ipcRenderer.on('animate-ui-element', (event, elementId, animationType) => {
    try {
        const element = document.getElementById(elementId);
        if (element && animationHelper[animationType]) {
            animationHelper[animationType](element);
        }
    } catch (error) {
        console.error('Error animating UI element:', error);
    }
});

window.addEventListener('DOMContentLoaded', () => {
    try {
        if (document && document.head) {
            const styleSheet = document.createElement('style');
            styleSheet.textContent = `
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
                }
            `;
            document.head.appendChild(styleSheet);
        }

        try {
            const versionElement = document.getElementById('app-version');
            if (versionElement) {
                versionElement.textContent = `GitRemind v${process.env.npm_package_version || '1.0.0'}`;
            }
        } catch (e) { console.error('Error setting app version:', e); }
        try {
            const todayDateElements = document.querySelectorAll('.day-indicator span');
            if (todayDateElements.length > 0) {
                const today = new Date();
                const formattedDate = today.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                todayDateElements.forEach(el => {
                    if (el) el.textContent = `Today's Date: ${formattedDate}`;
                });
            }
        } catch (e) { console.error('Error setting today date:', e); }

        try {
            const dateInputs = document.querySelectorAll('input[type="date"]');
            if (dateInputs.length > 0) {
                const today = new Date();
                const formattedDate = today.toISOString().split('T')[0];

                dateInputs.forEach(input => {
                    if (input && !input.value) {
                        input.value = formattedDate;
                    }
                });
            }
        } catch (e) { console.error('Error setting default date inputs:', e); }

        try {
            if (typeof window.feather !== 'undefined') {
                window.feather.replace();
            }
        } catch (e) { console.error('Error initializing feather icons:', e); }

    } catch (error) {
        console.error('Error in DOMContentLoaded handler:', error);
    }
});