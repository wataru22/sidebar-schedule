import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import { CalendarEvent, SchedulePluginSettings } from '../types';
import { CalendarManager } from '../calendar/CalendarManager';
import {
    formatDateHeader,
    formatTime,
    getDateKey,
    groupEventsByDate,
    getDateRange,
    parseDateKey,
} from '../utils/dateUtils';

export const VIEW_TYPE_SCHEDULE = 'schedule-view';

export class ScheduleView extends ItemView {
    private calendarManager: CalendarManager;
    private settings: SchedulePluginSettings;
    private events: CalendarEvent[] = [];
    private isLoading = false;

    constructor(
        leaf: WorkspaceLeaf,
        calendarManager: CalendarManager,
        settings: SchedulePluginSettings
    ) {
        super(leaf);
        this.calendarManager = calendarManager;
        this.settings = settings;
    }

    getViewType(): string {
        return VIEW_TYPE_SCHEDULE;
    }

    getDisplayText(): string {
        return 'Schedule';
    }

    getIcon(): string {
        return 'calendar';
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('schedule-view-container');

        await this.renderView(container);
    }

    async onClose(): Promise<void> {
        // Cleanup if needed
    }

    updateSettings(settings: SchedulePluginSettings): void {
        this.settings = settings;
    }

    private async renderView(container: HTMLElement): Promise<void> {
        container.empty();

        // Header
        this.renderHeader(container);

        // Content container
        const contentEl = container.createDiv({ cls: 'schedule-content' });

        // Load and render events
        await this.loadAndRenderEvents(contentEl);
    }

    private renderHeader(container: HTMLElement): void {
        const header = container.createDiv({ cls: 'schedule-header' });

        // Title
        header.createEl('span', { text: 'Schedule', cls: 'schedule-title' });

        // Controls
        const controls = header.createDiv({ cls: 'schedule-controls' });

        // Refresh button
        const refreshBtn = controls.createEl('button', {
            cls: 'schedule-refresh-btn clickable-icon',
            attr: { 'aria-label': 'Refresh' },
        });
        setIcon(refreshBtn, 'refresh-cw');
        refreshBtn.addEventListener('click', () => this.refresh());
    }

    private async loadAndRenderEvents(container: HTMLElement): Promise<void> {
        container.empty();

        if (this.isLoading) {
            this.renderLoading(container);
            return;
        }

        this.isLoading = true;
        this.renderLoading(container);

        try {
            const { startDate, endDate } = getDateRange(this.settings.daysToShow);
            this.events = await this.calendarManager.getEvents(startDate, endDate);

            // Filter all-day events if disabled
            if (!this.settings.showAllDayEvents) {
                this.events = this.events.filter(e => !e.isAllDay);
            }

            container.empty();

            if (this.events.length === 0) {
                this.renderEmpty(container);
            } else {
                const scrollContainer = container.createDiv({ cls: 'schedule-scroll-container' });
                this.renderEventList(scrollContainer);
            }
        } catch (error) {
            console.error('Error loading events:', error);
            container.empty();
            this.renderError(container, error as Error);
        } finally {
            this.isLoading = false;
        }
    }

    private renderLoading(container: HTMLElement): void {
        const loadingEl = container.createDiv({ cls: 'schedule-loading' });
        loadingEl.createSpan({ text: 'Loading events...' });
    }

    private renderEmpty(container: HTMLElement): void {
        const emptyEl = container.createDiv({ cls: 'schedule-empty' });
        const iconEl = emptyEl.createDiv({ cls: 'schedule-empty-icon' });
        setIcon(iconEl, 'calendar');
        emptyEl.createEl('p', { text: 'No upcoming events' });
    }

    private renderError(container: HTMLElement, error: Error): void {
        const errorEl = container.createDiv({ cls: 'schedule-error' });
        errorEl.createEl('p', { text: 'Failed to load events' });
        errorEl.createEl('small', { text: error.message });
    }

    private renderEventList(container: HTMLElement): void {
        const groupedEvents = groupEventsByDate(this.events);
        const sortedDates = Array.from(groupedEvents.keys()).sort();

        for (const dateKey of sortedDates) {
            const events = groupedEvents.get(dateKey);
            if (!events || events.length === 0) continue;

            const dateSection = container.createDiv({ cls: 'schedule-date-section' });

            // Date header
            const dateHeader = dateSection.createDiv({ cls: 'schedule-date-header' });
            const date = parseDateKey(dateKey);
            dateHeader.createSpan({ text: formatDateHeader(date) });

            // Events for this date
            for (const event of events) {
                this.renderEventItem(dateSection, event);
            }
        }
    }

    private renderEventItem(container: HTMLElement, event: CalendarEvent): void {
        const eventEl = container.createDiv({ cls: 'schedule-event-item' });

        // Color indicator (first, on the left)
        if (this.settings.showCalendarColors && event.calendarColor) {
            const colorIndicator = eventEl.createDiv({ cls: 'schedule-event-color' });
            colorIndicator.style.backgroundColor = event.calendarColor;
        }

        // Content container
        const contentEl = eventEl.createDiv({ cls: 'schedule-event-content' });

        // Time
        const timeEl = contentEl.createDiv({ cls: 'schedule-event-time' });
        if (event.isAllDay) {
            timeEl.setText('All day');
        } else {
            const startTime = formatTime(event.startDate, this.settings.timeFormat === '24h');
            if (event.endDate && event.endDate.getTime() !== event.startDate.getTime()) {
                const endTime = formatTime(event.endDate, this.settings.timeFormat === '24h');
                timeEl.setText(`${startTime} - ${endTime}`);
            } else {
                timeEl.setText(startTime);
            }
        }

        // Title
        contentEl.createDiv({ cls: 'schedule-event-title', text: event.title });

        // Location
        if (event.location) {
            const locationEl = contentEl.createDiv({ cls: 'schedule-event-location' });
            setIcon(locationEl.createSpan(), 'map-pin');
            locationEl.createSpan({ text: event.location });
        }
    }


    async refresh(): Promise<void> {
        const contentEl = this.containerEl.querySelector('.schedule-content');
        if (contentEl) {
            await this.loadAndRenderEvents(contentEl as HTMLElement);
        }
    }
}
