const elements = {
    settingsBtn: document.getElementById('settingsBtn'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    settingsPanel: document.getElementById('settingsPanel'),
    settingsOverlay: document.getElementById('settingsOverlay'),
    startWithSystem: document.getElementById('startWithSystem'),
    minimizeToTray: document.getElementById('minimizeToTray'),
    defaultNotificationDuration: document.getElementById('defaultNotificationDuration'),
    playSoundOnNotification: document.getElementById('playSoundOnNotification'),
    glassmorphismEffect: document.getElementById('glassmorphismEffect'),
    resetAppBtn: document.getElementById('resetAppBtn'),

    prevMonthBtn: document.getElementById('prevMonth'),
    nextMonthBtn: document.getElementById('nextMonth'),
    currentMonthEl: document.getElementById('currentMonth'),
    calendarDays: document.getElementById('calendarDays'),

    createReminderBtn: document.getElementById('createReminderBtn'),
    createReminderBtnEmpty: document.getElementById('createReminderBtnEmpty'),
    cancelReminderBtn: document.getElementById('cancelReminderBtn'),
    cancelReminderBtnBottom: document.getElementById('cancelReminderBtnBottom'),
    reminderForm: document.getElementById('reminderForm'),
    reminderFormContainer: document.getElementById('reminderFormContainer'),
    isRecurringCheckbox: document.getElementById('isRecurring'),
    recurringOptions: document.getElementById('recurringOptions'),
    recurrencePattern: document.getElementById('recurrencePattern'),
    weekDaysSelector: document.getElementById('weekDaysSelector'),
    monthDaySelector: document.getElementById('monthDaySelector'),
    recurrenceEnd: document.getElementById('recurrenceEnd'),
    occurrencesInput: document.getElementById('occurrencesInput'),
    endDateInput: document.getElementById('endDateInput'),

    selectedDay: document.getElementById('selectedDay'),
    noDaySelected: document.getElementById('noDaySelected'),
    dayContent: document.getElementById('dayContent'),
    selectedDate: document.getElementById('selectedDate'),
    dayOfWeek: document.getElementById('dayOfWeek'),
    dayReminders: document.getElementById('dayReminders'),
    addReminderToDayBtn: document.getElementById('addReminderToDayBtn'),
    createReminderForTodayBtn: document.getElementById('createReminderForTodayBtn'),

    upcomingReminders: document.getElementById('upcomingReminders'),

    appVersion: document.querySelector('#app-version')
};

const state = {
    currentDate: new Date(),
    selectedDate: null,
    reminders: [],
    settings: {
        startWithSystem: true,
        minimizeToTray: true,
        defaultNotificationDuration: 10,
        playSoundOnNotification: true,
        glassmorphismEffect: true
    },
    currentView: 'month',
    editingReminder: null,
    recurringWeekdays: [],
    animationDuration: 300,
    notifications: []
};

async function initApp() {
    console.log("Initializing GitRemind app...");
    await loadSettings();
    applySettings();
    setupEventListeners();
    await loadReminders();
    renderCalendar();
    updateUpcomingReminders();
    updateDisplayDates();
}

async function loadSettings() {
    try {
        console.log("Loading settings...");
        const settings = await window.api.settings.get();
        console.log("Settings loaded:", settings);
        state.settings = { ...state.settings, ...settings };
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function applySettings() {
    console.log("Applying settings to UI...");

    if (elements.startWithSystem) {
        elements.startWithSystem.checked = state.settings.startWithSystem;
    }

    if (elements.minimizeToTray) {
        elements.minimizeToTray.checked = state.settings.minimizeToTray;
    }

    if (elements.defaultNotificationDuration) {
        elements.defaultNotificationDuration.value = state.settings.defaultNotificationDuration;
    }

    if (elements.playSoundOnNotification) {
        elements.playSoundOnNotification.checked = state.settings.playSoundOnNotification;
    }

    if (elements.glassmorphismEffect) {
        elements.glassmorphismEffect.checked = state.settings.glassmorphismEffect;
    }

    applyGlassmorphismEffect();

    if (elements.appVersion && window.appInfo && window.appInfo.version) {
        elements.appVersion.textContent = `GitRemind v${window.appInfo.version}`;
    }
}

function applyGlassmorphismEffect() {
    if (!state.settings.glassmorphismEffect) {
        document.querySelectorAll('.glass').forEach(el => {
            el.style.backdropFilter = 'none';
            el.style.webkitBackdropFilter = 'none';
            el.style.background = 'var(--github-secondary)';
        });

        document.querySelectorAll('.glass-nav').forEach(el => {
            el.style.backdropFilter = 'none';
            el.style.webkitBackdropFilter = 'none';
            el.style.background = 'var(--github-secondary)';
        });
    } else {
        document.querySelectorAll('.glass').forEach(el => {
            el.style.backdropFilter = 'blur(12px)';
            el.style.webkitBackdropFilter = 'blur(12px)';
            el.style.background = 'rgba(22, 27, 34, 0.8)';
        });

        document.querySelectorAll('.glass-nav').forEach(el => {
            el.style.backdropFilter = 'blur(12px)';
            el.style.webkitBackdropFilter = 'blur(12px)';
            el.style.background = 'rgba(22, 27, 34, 0.95)';
        });
    }
}

function setupEventListeners() {
    console.log("Setting up event listeners...");

    if (elements.settingsBtn && elements.settingsPanel && elements.settingsOverlay) {
        elements.settingsBtn.addEventListener('click', () => {
            elements.settingsPanel.classList.add('visible');
            elements.settingsOverlay.classList.add('visible');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        });
    }

    if (elements.closeSettingsBtn && elements.settingsPanel && elements.settingsOverlay) {
        elements.closeSettingsBtn.addEventListener('click', () => {
            elements.settingsPanel.classList.remove('visible');
            elements.settingsOverlay.classList.remove('visible');
            document.body.style.overflow = ''; // Enable scrolling
        });
    }

    if (elements.settingsOverlay) {
        elements.settingsOverlay.addEventListener('click', () => {
            elements.settingsPanel.classList.remove('visible');
            elements.settingsOverlay.classList.remove('visible');
            document.body.style.overflow = ''; // Enable scrolling
        });
    }

    if (elements.startWithSystem) {
        elements.startWithSystem.addEventListener('change', saveSettings);
    }

    if (elements.minimizeToTray) {
        elements.minimizeToTray.addEventListener('change', saveSettings);
    }

    if (elements.defaultNotificationDuration) {
        elements.defaultNotificationDuration.addEventListener('change', saveSettings);
    }

    if (elements.playSoundOnNotification) {
        elements.playSoundOnNotification.addEventListener('change', saveSettings);
    }

    if (elements.glassmorphismEffect) {
        elements.glassmorphismEffect.addEventListener('change', () => {
            saveSettings();
            applyGlassmorphismEffect();
        });
    }

    if (elements.resetAppBtn) {
        elements.resetAppBtn.addEventListener('click', async () => {
            const confirmed = confirm('Are you sure you want to reset the application? This will delete all reminders and settings.');
            if (confirmed) {
                await window.api.settings.reset();
            }
        });
    }

    if (elements.prevMonthBtn) {
        elements.prevMonthBtn.addEventListener('click', () => {
            state.currentDate.setMonth(state.currentDate.getMonth() - 1);
            renderCalendar();
        });
    }

    if (elements.nextMonthBtn) {
        elements.nextMonthBtn.addEventListener('click', () => {
            state.currentDate.setMonth(state.currentDate.getMonth() + 1);
            renderCalendar();
        });
    }

    if (elements.isRecurringCheckbox && elements.recurringOptions) {
        elements.isRecurringCheckbox.addEventListener('change', function() {
            if (this.checked) {
                elements.recurringOptions.classList.remove('hidden');
                setTimeout(() => {
                    elements.recurringOptions.classList.add('animate-fade-in');
                }, 10);
            } else {
                elements.recurringOptions.classList.remove('animate-fade-in');
                setTimeout(() => {
                    elements.recurringOptions.classList.add('hidden');
                }, state.animationDuration);
            }
        });
    }

    if (elements.recurrencePattern && elements.weekDaysSelector && elements.monthDaySelector) {
        elements.recurrencePattern.addEventListener('change', function() {
            if (this.value === 'weekly') {
                elements.weekDaysSelector.classList.remove('hidden');
                setTimeout(() => {
                    elements.weekDaysSelector.classList.add('animate-fade-in');
                }, 10);
            } else {
                elements.weekDaysSelector.classList.remove('animate-fade-in');
                setTimeout(() => {
                    elements.weekDaysSelector.classList.add('hidden');
                }, state.animationDuration);
            }

            if (this.value === 'monthly') {
                elements.monthDaySelector.classList.remove('hidden');
                setTimeout(() => {
                    elements.monthDaySelector.classList.add('animate-fade-in');
                }, 10);
            } else {
                elements.monthDaySelector.classList.remove('animate-fade-in');
                setTimeout(() => {
                    elements.monthDaySelector.classList.add('hidden');
                }, state.animationDuration);
            }
        });
    }

    if (elements.recurrenceEnd && elements.occurrencesInput && elements.endDateInput) {
        elements.recurrenceEnd.addEventListener('change', function() {
            if (this.value === 'after') {
                elements.occurrencesInput.classList.remove('hidden');
                setTimeout(() => {
                    elements.occurrencesInput.classList.add('animate-fade-in');
                }, 10);
            } else {
                elements.occurrencesInput.classList.remove('animate-fade-in');
                setTimeout(() => {
                    elements.occurrencesInput.classList.add('hidden');
                }, state.animationDuration);
            }

            if (this.value === 'on-date') {
                elements.endDateInput.classList.remove('hidden');
                setTimeout(() => {
                    elements.endDateInput.classList.add('animate-fade-in');
                }, 10);
            } else {
                elements.endDateInput.classList.remove('animate-fade-in');
                setTimeout(() => {
                    elements.endDateInput.classList.add('hidden');
                }, state.animationDuration);
            }
        });
    }

    if (elements.createReminderBtn) {
        elements.createReminderBtn.addEventListener('click', showReminderForm);
    }

    if (elements.createReminderBtnEmpty) {
        elements.createReminderBtnEmpty.addEventListener('click', showReminderForm);
    }

    if (elements.cancelReminderBtn) {
        elements.cancelReminderBtn.addEventListener('click', hideReminderForm);
    }

    if (elements.cancelReminderBtnBottom) {
        elements.cancelReminderBtnBottom.addEventListener('click', hideReminderForm);
    }

    if (elements.reminderForm) {
        elements.reminderForm.addEventListener('submit', handleReminderSubmit);
    }

    if (elements.addReminderToDayBtn) {
        elements.addReminderToDayBtn.addEventListener('click', () => {
            showReminderForm(state.selectedDate);
        });
    }

    if (elements.createReminderForTodayBtn) {
        elements.createReminderForTodayBtn.addEventListener('click', () => {
            const today = new Date();
            selectDay(today);
            setTimeout(() => showReminderForm(today), 300);
        });
    }

    document.querySelectorAll('.weekday-item').forEach(item => {
        item.addEventListener('click', function() {
            const checkbox = this.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                if (checkbox.checked) {
                    this.classList.add('bg-blue-900', 'bg-opacity-20', 'border-blue-500');
                } else {
                    this.classList.remove('bg-blue-900', 'bg-opacity-20', 'border-blue-500');
                }
            }
        });
    });

    document.querySelectorAll('.weekday-item input[type="checkbox"]').forEach(checkbox => {
        const item = checkbox.closest('.weekday-item');
        if (item) {
            if (checkbox.checked) {
                item.classList.add('bg-blue-900', 'bg-opacity-20', 'border-blue-500');
            } else {
                item.classList.remove('bg-blue-900', 'bg-opacity-20', 'border-blue-500');
            }
        }
    });
}

async function saveSettings() {
    try {
        console.log("Saving settings...");
        const updatedSettings = {
            startWithSystem: elements.startWithSystem.checked,
            minimizeToTray: elements.minimizeToTray.checked,
            defaultNotificationDuration: parseInt(elements.defaultNotificationDuration.value),
            playSoundOnNotification: elements.playSoundOnNotification.checked,
            glassmorphismEffect: elements.glassmorphismEffect.checked
        };

        console.log("New settings:", updatedSettings);
        state.settings = await window.api.settings.save(updatedSettings);

        showNotification('Settings saved successfully', 'success');

        console.log("Settings saved successfully");
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Failed to save settings', 'error');
    }
}

function renderCalendar() {
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    elements.currentMonthEl.textContent = `${monthNames[month]} ${year}`;

    elements.calendarDays.innerHTML = '';

    const firstDay = new Date(year, month, 1);
    const startingDay = firstDay.getDay();

    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    for (let i = 0; i < startingDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day outside-month';
        elements.calendarDays.appendChild(emptyCell);
    }

    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    const isSelectedMonth = state.selectedDate &&
        state.selectedDate.getMonth() === month &&
        state.selectedDate.getFullYear() === year;

    for (let day = 1; day <= totalDays; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day';
        dayCell.textContent = day;

        const currentDate = new Date(year, month, day);
        const dayOfWeek = currentDate.getDay();

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            dayCell.classList.add('weekend');
        }

        const dateString = formatDateString(currentDate);
        const hasStandardReminders = state.reminders.some(reminder =>
            !reminder.isRecurring && reminder.date === dateString
        );

        const hasRecurringReminders = state.reminders.some(reminder => {
            if (!reminder.isRecurring) return false;

            switch(reminder.recurrencePattern) {
                case 'daily':
                    return true;

                case 'weekly':
                    if (!reminder.weekdays || reminder.weekdays.length === 0) {
                        const originalDate = new Date(reminder.date);
                        return currentDate.getDay() === originalDate.getDay();
                    } else {
                        return reminder.weekdays.includes(currentDate.getDay());
                    }

                case 'monthly':
                    if (reminder.monthDay) {
                        return day === parseInt(reminder.monthDay);
                    } else {
                        const originalDate = new Date(reminder.date);
                        return day === originalDate.getDate();
                    }

                case 'yearly':
                    const originalDate = new Date(reminder.date);
                    return month === originalDate.getMonth() && day === originalDate.getDate();

                default:
                    return false;
            }
        });

        if (hasStandardReminders) {
            dayCell.classList.add('has-reminder');
        }

        if (hasRecurringReminders) {
            dayCell.classList.add('has-recurring');
        }

        if (isCurrentMonth && day === today.getDate()) {
            dayCell.classList.add('today');
        }
        if (isSelectedMonth && state.selectedDate.getDate() === day) {
            dayCell.classList.add('selected');
        }

        dayCell.addEventListener('click', () => {
            document.querySelectorAll('.day.selected').forEach(el => {
                el.classList.remove('selected');
            });
            dayCell.classList.add('selected');
            selectDay(new Date(year, month, day));
        });

        elements.calendarDays.appendChild(dayCell);
    }
}

function formatDateString(date) {
    return window.utils && window.utils.formatDate ?
        window.utils.formatDate(date) :
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function getDayOfWeek(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

function updateDisplayDates() {
    const today = new Date();
    const formattedDate = formatDisplayDate(today);
    document.querySelectorAll('.day-indicator span').forEach(el => {
        el.textContent = `Today's Date: ${formattedDate}`;
    });
}

function selectDay(date) {
    state.selectedDate = date;
    elements.noDaySelected.classList.add('hidden');
    elements.dayContent.classList.remove('hidden');
    elements.dayContent.classList.add('animate-fade-in');
    elements.selectedDate.textContent = formatDisplayDate(date);
    if (elements.dayOfWeek) {
        elements.dayOfWeek.textContent = getDayOfWeek(date);
    }

    showRemindersForDay(date);
}

function reminderOccursOnDate(reminder, date) {
    const dateString = formatDateString(date);

    if (!reminder.isRecurring) {
        return reminder.date === dateString;
    }

    const recurrenceStart = new Date(reminder.date);

    if (date < recurrenceStart) return false;

    if (reminder.recurrenceEnd === 'on-date' && reminder.endDate) {
        const endDate = new Date(reminder.endDate);
        if (date > endDate) return false;
    }

    switch (reminder.recurrencePattern) {
        case 'daily':
            return true;

        case 'weekly':
            if (reminder.weekdays && reminder.weekdays.length > 0) {
                return reminder.weekdays.includes(date.getDay());
            } else {
                return date.getDay() === recurrenceStart.getDay();
            }

        case 'monthly':
            if (reminder.monthDay) {
                return date.getDate() === parseInt(reminder.monthDay);
            } else {
                return date.getDate() === recurrenceStart.getDate();
            }

        case 'yearly':
            return date.getDate() === recurrenceStart.getDate() &&
                date.getMonth() === recurrenceStart.getMonth();

        default:
            return false;
    }
}

function showRemindersForDay(date) {
    const dayReminders = state.reminders.filter(reminder =>
        reminderOccursOnDate(reminder, date)
    );

    elements.dayReminders.innerHTML = '';

    if (dayReminders.length === 0) {
        const noReminders = document.createElement('div');
        noReminders.className = 'empty-state animate-fade-in';
        noReminders.innerHTML = `
            <div class="empty-state-icon">
                <i data-feather="calendar" class="h-8 w-8 text-gray-500"></i>
            </div>
            <p class="text-lg font-semibold mb-2">No reminders for this day</p>
            <p class="text-gray-400 mb-6 text-center">Create a reminder to get started</p>
            <button id="quickAddReminder" class="btn flex items-center">
                <i data-feather="plus" class="h-4 w-4 mr-2"></i>
                Add reminder
            </button>
        `;
        elements.dayReminders.appendChild(noReminders);

        document.getElementById('quickAddReminder').addEventListener('click', () => {
            showReminderForm(date);
        });

        feather.replace();
        return;
    }

    dayReminders.sort((a, b) => a.time.localeCompare(b.time));

    dayReminders.forEach((reminder, index) => {
        const reminderEl = createReminderElement(reminder, date);
        reminderEl.style.animationDelay = `${index * 100}ms`;
        elements.dayReminders.appendChild(reminderEl);
    });

    feather.replace();
}

function createReminderElement(reminder, displayDate = null) {
    const reminderEl = document.createElement('div');
    reminderEl.className = 'reminder-card animate-slide-up';
    reminderEl.dataset.id = reminder.id;

    if (reminder.isRecurring && displayDate) {
        const dateString = formatDateString(displayDate);
        reminderEl.dataset.instanceDate = dateString;
    }

    let typeIcon = 'bell';
    let typeBadgeClass = 'type-other';

    switch(reminder.reminderType) {
        case 'meeting':
            typeIcon = 'users';
            typeBadgeClass = 'type-meeting';
            break;
        case 'deadline':
            typeIcon = 'alert-triangle';
            typeBadgeClass = 'type-deadline';
            break;
        case 'personal':
            typeIcon = 'heart';
            typeBadgeClass = 'type-personal';
            break;
    }

    let reminderContent = `
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <div class="flex items-center mb-2">
                    <span class="type-badge ${typeBadgeClass} mr-2">
                        <i data-feather="${typeIcon}" class="h-3 w-3 mr-1"></i>
                        ${reminder.reminderType.charAt(0).toUpperCase() + reminder.reminderType.slice(1)}
                    </span>
    `;

    if (reminder.isRecurring) {
        const recurrenceText = window.utils && window.utils.formatRecurrencePattern ?
            window.utils.formatRecurrencePattern(reminder) :
            reminder.recurrencePattern.charAt(0).toUpperCase() + reminder.recurrencePattern.slice(1);

        reminderContent += `
                    <span class="recurring-badge flex items-center text-xs">
                        <i data-feather="repeat" class="h-3 w-3 mr-1"></i>
                        ${recurrenceText}
                    </span>
        `;
    }

    reminderContent += `
                </div>
                <h3 class="text-lg font-semibold">${reminder.title}</h3>
                ${reminder.description ? `<p class="text-gray-400 text-sm mt-1">${reminder.description}</p>` : ''}
            </div>
            <div class="text-right">
                <div class="text-gray-300 font-medium">${formatTime(reminder.time)}</div>
                <div class="text-xs text-gray-500 mt-1">${reminder.notificationDuration} sec notification</div>
            </div>
        </div>
        <div class="flex justify-end mt-4 space-x-2">
            <button class="edit-reminder p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-200 transition-all duration-200" title="Edit">
                <i data-feather="edit-2" class="h-4 w-4"></i>
            </button>
            <button class="delete-reminder p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-200 transition-all duration-200" title="Delete">
                <i data-feather="trash-2" class="h-4 w-4"></i>
            </button>
        </div>
    `;

    reminderEl.innerHTML = reminderContent;

    reminderEl.querySelector('.edit-reminder').addEventListener('click', () => {
        editReminder(reminder);
    });

    reminderEl.querySelector('.delete-reminder').addEventListener('click', () => {
        deleteReminder(reminder.id);
    });

    return reminderEl;
}

async function loadReminders() {
    try {
        console.log("Loading reminders...");
        const reminders = await window.api.invoke('get-reminders');
        state.reminders = reminders || [];
        console.log(`Loaded ${state.reminders.length} reminders`);
    } catch (error) {
        console.error('Error loading reminders:', error);
        state.reminders = [];
    }
}

function updateUpcomingReminders() {
    elements.upcomingReminders.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = [];

    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + i);
        state.reminders.forEach(reminder => {
            if (reminderOccursOnDate(reminder, currentDate)) {
                const reminderInstance = {
                    ...reminder,
                    instanceDate: formatDateString(currentDate)
                };
                upcoming.push(reminderInstance);
            }
        });
    }

    upcoming.sort((a, b) => {
        if (a.instanceDate !== b.instanceDate) {
            return a.instanceDate.localeCompare(b.instanceDate);
        }
        return a.time.localeCompare(b.time);
    });

    if (upcoming.length === 0) {
        const noUpcoming = document.createElement('div');
        noUpcoming.className = 'flex items-center text-sm text-gray-400 py-2 px-3 rounded-lg bg-gray-800 bg-opacity-30';
        noUpcoming.innerHTML = `
            <i data-feather="calendar" class="h-4 w-4 mr-2 text-gray-500"></i>
            No upcoming reminders
        `;
        elements.upcomingReminders.appendChild(noUpcoming);
    } else {
        upcoming.slice(0, 5).forEach((reminder, index) => {
            const reminderDate = new Date(reminder.instanceDate + 'T' + reminder.time);
            const isToday = new Date(reminder.instanceDate).setHours(0, 0, 0, 0) === today.getTime();

            const reminderEl = document.createElement('div');
            reminderEl.className = 'text-sm p-3 hover:bg-gray-800 rounded-lg cursor-pointer transition-all duration-200 bg-gray-800 bg-opacity-30 border border-transparent hover:border-gray-700';
            reminderEl.style.opacity = '0';
            reminderEl.style.animation = `slideUp 0.3s ease forwards ${index * 0.05}s`;

            let dateText;
            if (isToday) {
                dateText = 'Today';
            } else {
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                const isTomorrow = new Date(reminder.instanceDate).setHours(0, 0, 0, 0) === tomorrow.getTime();

                if (isTomorrow) {
                    dateText = 'Tomorrow';
                } else {
                    dateText = reminderDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                }
            }

            let typeIcon = 'bell';
            switch(reminder.reminderType) {
                case 'meeting': typeIcon = 'users'; break;
                case 'deadline': typeIcon = 'alert-triangle'; break;
                case 'personal': typeIcon = 'heart'; break;
            }

            let reminderContent = `
                <div class="flex items-start">
                    <div class="p-1.5 rounded-full bg-blue-900 bg-opacity-20 mr-2.5 mt-0.5">
                        <i data-feather="${typeIcon}" class="h-3 w-3 text-blue-400"></i>
                    </div>
                    <div class="flex-1">
                        <div class="font-semibold">${reminder.title}</div>
                        <div class="flex justify-between mt-1 text-xs text-gray-400">
                            <span class="flex items-center">
                                <i data-feather="calendar" class="h-3 w-3 mr-1"></i>
                                ${dateText}
                            </span>
                            <span class="flex items-center">
                                <i data-feather="clock" class="h-3 w-3 mr-1"></i>
                                ${formatTime(reminder.time)}
                            </span>
                        </div>
            `;

            if (reminder.isRecurring) {
                reminderContent += `
                        <div class="mt-1.5">
                            <span class="text-xs text-purple-400 flex items-center">
                                <i data-feather="repeat" class="h-3 w-3 mr-1"></i>
                                Recurring
                            </span>
                        </div>
                `;
            }

            reminderContent += `
                    </div>
                </div>
            `;

            reminderEl.innerHTML = reminderContent;

            reminderEl.addEventListener('click', () => {
                selectDay(new Date(reminder.instanceDate));
            });

            elements.upcomingReminders.appendChild(reminderEl);
        });
    }

    feather.replace();
}

function showReminderForm(date = null) {
    elements.reminderForm.reset();
    elements.recurringOptions.classList.add('hidden');
    elements.weekDaysSelector.classList.add('hidden');
    elements.monthDaySelector.classList.add('hidden');
    elements.occurrencesInput.classList.add('hidden');
    elements.endDateInput.classList.add('hidden');
    elements.recurringOptions.classList.remove('animate-fade-in');
    elements.weekDaysSelector.classList.remove('animate-fade-in');
    elements.monthDaySelector.classList.remove('animate-fade-in');
    elements.occurrencesInput.classList.remove('animate-fade-in');
    elements.endDateInput.classList.remove('animate-fade-in');
    document.querySelectorAll('.weekday-item').forEach(item => {
        item.classList.remove('bg-blue-900', 'bg-opacity-20', 'border-blue-500');
    });

    if (state.editingReminder) {
        elements.reminderForm.title.value = state.editingReminder.title;
        elements.reminderForm.description.value = state.editingReminder.description || '';
        elements.reminderForm.date.value = state.editingReminder.date;
        elements.reminderForm.time.value = state.editingReminder.time;
        elements.reminderForm.reminderType.value = state.editingReminder.reminderType || 'meeting';
        elements.reminderForm.notificationDuration.value = state.editingReminder.notificationDuration ||
            state.settings.defaultNotificationDuration || 10;

        elements.isRecurringCheckbox.checked = state.editingReminder.isRecurring || false;
        if (state.editingReminder.isRecurring) {
            elements.recurringOptions.classList.remove('hidden');
            setTimeout(() => {
                elements.recurringOptions.classList.add('animate-fade-in');
            }, 10);

            elements.recurrencePattern.value = state.editingReminder.recurrencePattern || 'daily';

            if (state.editingReminder.recurrencePattern === 'weekly' && state.editingReminder.weekdays) {
                elements.weekDaysSelector.classList.remove('hidden');
                setTimeout(() => {
                    elements.weekDaysSelector.classList.add('animate-fade-in');
                }, 10);

                for (let i = 0; i < 7; i++) {
                    const checkbox = elements.reminderForm[`weekday_${i}`];
                    if (checkbox) {
                        checkbox.checked = state.editingReminder.weekdays.includes(i);
                        if (checkbox.checked) {
                            const item = checkbox.closest('.weekday-item');
                            if (item) {
                                item.classList.add('bg-blue-900', 'bg-opacity-20', 'border-blue-500');
                            }
                        }
                    }
                }
            }

            if (state.editingReminder.recurrencePattern === 'monthly') {
                elements.monthDaySelector.classList.remove('hidden');
                setTimeout(() => {
                    elements.monthDaySelector.classList.add('animate-fade-in');
                }, 10);

                elements.reminderForm.monthDay.value = state.editingReminder.monthDay ||
                    new Date(state.editingReminder.date).getDate();
            }

            elements.recurrenceEnd.value = state.editingReminder.recurrenceEnd || 'never';
            if (state.editingReminder.recurrenceEnd === 'after') {
                elements.occurrencesInput.classList.remove('hidden');
                setTimeout(() => {
                    elements.occurrencesInput.classList.add('animate-fade-in');
                }, 10);

                elements.reminderForm.occurrences.value = state.editingReminder.occurrences || 10;
            } else if (state.editingReminder.recurrenceEnd === 'on-date') {
                elements.endDateInput.classList.remove('hidden');
                setTimeout(() => {
                    elements.endDateInput.classList.add('animate-fade-in');
                }, 10);

                elements.reminderForm.endDate.value = state.editingReminder.endDate || '';
            }
        }
    } else {
        elements.isRecurringCheckbox.checked = false;
        elements.reminderForm.notificationDuration.value = state.settings.defaultNotificationDuration || 10;

        if (date instanceof Date) {
            elements.reminderForm.date.value = formatDateString(date);
        } else if (state.selectedDate) {
            elements.reminderForm.date.value = formatDateString(state.selectedDate);
        } else {
            elements.reminderForm.date.value = formatDateString(new Date());
        }

        const now = new Date();
        now.setMinutes(0);
        now.setHours(now.getHours() + 1);
        elements.reminderForm.time.value = `${String(now.getHours()).padStart(2, '0')}:00`;
    }

    elements.reminderFormContainer.classList.remove('hidden');
    setTimeout(() => {
        elements.reminderFormContainer.classList.add('animate-scale-in');
        if (elements.reminderForm.title) {
            elements.reminderForm.title.focus();
        }
    }, 10);
}

function hideReminderForm() {
    elements.reminderFormContainer.classList.remove('animate-scale-in');
    setTimeout(() => {
        elements.reminderFormContainer.classList.add('hidden');
        state.editingReminder = null;
    }, state.animationDuration);
}

async function handleReminderSubmit(e) {
    e.preventDefault();

    try {
        const reminder = {
            id: state.editingReminder ? state.editingReminder.id : null,
            title: elements.reminderForm.title.value,
            description: elements.reminderForm.description.value,
            date: elements.reminderForm.date.value,
            time: elements.reminderForm.time.value,
            reminderType: elements.reminderForm.reminderType.value,
            notificationDuration: parseInt(elements.reminderForm.notificationDuration.value),
            notified: false,
            isRecurring: elements.isRecurringCheckbox.checked
        };

        if (reminder.isRecurring) {
            reminder.recurrencePattern = elements.recurrencePattern.value;
            if (reminder.recurrencePattern === 'weekly') {
                reminder.weekdays = [];
                for (let i = 0; i < 7; i++) {
                    if (elements.reminderForm[`weekday_${i}`].checked) {
                        reminder.weekdays.push(i);
                    }
                }

                if (reminder.weekdays.length === 0) {
                    const reminderDate = new Date(reminder.date);
                    reminder.weekdays = [reminderDate.getDay()];
                }
            }

            if (reminder.recurrencePattern === 'monthly') {
                reminder.monthDay = elements.reminderForm.monthDay.value;
            }

            reminder.recurrenceEnd = elements.recurrenceEnd.value;

            if (reminder.recurrenceEnd === 'after') {
                reminder.occurrences = parseInt(elements.reminderForm.occurrences.value);
            } else if (reminder.recurrenceEnd === 'on-date') {
                reminder.endDate = elements.reminderForm.endDate.value;
            }
        }

        console.log("Sending reminder to main process:", reminder);
        const savedReminder = await window.api.invoke('save-reminder', reminder);

        if (savedReminder) {
            await loadReminders();
            renderCalendar();
            updateUpcomingReminders();
            if (state.selectedDate) {
                showRemindersForDay(state.selectedDate);
            }
            showNotification(state.editingReminder ? 'Reminder updated successfully' : 'Reminder created successfully', 'success');
        } else {
            console.error("Failed to save reminder");
            showNotification("Failed to save reminder", 'error');
        }

        hideReminderForm();
    } catch (error) {
        console.error('Error saving reminder:', error);
        showNotification("An error occurred while saving the reminder", 'error');
    }
}

function editReminder(reminder) {
    state.editingReminder = reminder;
    showReminderForm();
}

async function deleteReminder(id) {
    try {
        const confirmed = confirm('Are you sure you want to delete this reminder?');
        if (!confirmed) return;

        console.log("Deleting reminder:", id);
        const success = await window.api.invoke('delete-reminder', id);

        if (success) {
            console.log("Reminder deleted successfully");
            await loadReminders();
            renderCalendar();
            updateUpcomingReminders();
            if (state.selectedDate) {
                showRemindersForDay(state.selectedDate);
            }

            showNotification("Reminder deleted successfully", 'success');
        } else {
            console.error("Failed to delete reminder");
            showNotification("Failed to delete reminder", 'error');
        }
    } catch (error) {
        console.error('Error deleting reminder:', error);
        showNotification("An error occurred while deleting the reminder", 'error');
    }
}

function showNotification(message, type = 'success') {
    document.querySelectorAll('.notification').forEach(notification => {
        notification.remove();
    });
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    let icon = 'check-circle';
    if (type === 'error') icon = 'alert-circle';

    notification.innerHTML = `
        <div class="flex items-center">
            <i data-feather="${icon}" class="h-5 w-5 mr-2 ${type === 'success' ? 'text-green-400' : 'text-red-400'}"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);
    feather.replace();
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(10px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

if (window.api && window.api.receive) {
    window.api.receive('show-reminder', (reminderId) => {
        try {
            const reminder = state.reminders.find(r => r.id === reminderId);
            if (reminder) {
                let dateToShow = new Date(reminder.date);
                if (reminder.isRecurring) {
                    dateToShow = new Date();
                }
                selectDay(dateToShow);
                setTimeout(() => {
                    const reminderEl = document.querySelector(`[data-id="${reminderId}"]`);
                    if (reminderEl) {
                        reminderEl.classList.add('bg-blue-900', 'bg-opacity-20');
                        reminderEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => {
                            reminderEl.classList.remove('bg-blue-900', 'bg-opacity-20');
                        }, 3000);
                    }
                }, 300);
            } else {
                console.warn("Reminder not found:", reminderId);
            }
        } catch (error) {
            console.error('Error showing reminder:', error);
        }
    });

    window.api.receive('show-reminder-fallback', (reminder) => {
        try {
            console.log("Showing fallback notification:", reminder.title);

            if (window.utils && window.utils.showFallbackNotification) {
                window.utils.showFallbackNotification(
                    reminder.title,
                    reminder.description || 'Click to view reminder'
                );
            }

            document.body.classList.add('animate-pulse');
            setTimeout(() => {
                document.body.classList.remove('animate-pulse');
            }, 2000);
        } catch (error) {
            console.error('Error showing fallback notification:', error);
        }
    });
}

if (!window.api) {
    console.warn('window.api not found, creating mock implementation for development');
    window.api = {
        settings: {
            get: async () => ({}),
            save: async (settings) => settings,
            reset: async () => true
        },
        invoke: async (channel, ...args) => {
            console.log(`Mock invoke: ${channel}`, args);
            if (channel === 'get-reminders') return [];
            if (channel === 'save-reminder') return args[0];
            if (channel === 'delete-reminder') return true;
            return null;
        },
        receive: (channel, callback) => {
            console.log(`Mock register receiver for ${channel}`);
        }
    };
}

if (!window.utils) {
    console.warn('window.utils not found, creating mock implementation for development');
    window.utils = {
        formatDate: (date) => {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        },
        formatRecurrencePattern: (reminder) => {
            return reminder.recurrencePattern.charAt(0).toUpperCase() + reminder.recurrencePattern.slice(1);
        },
        showFallbackNotification: (title, body) => {
            console.log(`Mock notification: ${title} - ${body}`);
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing app...");
    feather.replace();
    initApp();
});