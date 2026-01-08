export interface CalendarEvent {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
    isAllDay: boolean;
    location?: string;
    notes?: string;
    calendarName: string;
    calendarColor?: string;
    source: 'apple';
}

export interface Calendar {
    id: string;
    name: string;
    color?: string;
    source: 'apple';
    accountTitle?: string;
}

export interface SchedulePluginSettings {
    // Display settings
    daysToShow: number;
    defaultViewMode: 'list';
    showAllDayEvents: boolean;
    timeFormat: '12h' | '24h';

    // Apple Calendar settings
    appleCalendarEnabled: boolean;
    selectedAppleCalendars: string[];


    // Refresh settings
    autoRefreshEnabled: boolean;
    autoRefreshInterval: number;

    // Appearance
    showCalendarColors: boolean;
    compactMode: boolean;
}

export const DEFAULT_SETTINGS: SchedulePluginSettings = {
    daysToShow: 7,
    defaultViewMode: 'list',
    showAllDayEvents: true,
    timeFormat: '12h',

    appleCalendarEnabled: true,
    selectedAppleCalendars: [],


    autoRefreshEnabled: true,
    autoRefreshInterval: 15,

    showCalendarColors: true,
    compactMode: false,
};

