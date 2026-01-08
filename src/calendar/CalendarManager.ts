import { CalendarEvent, Calendar } from '../types';
import { CalendarService } from './CalendarService';

export class CalendarManager {
    private sources: Map<string, CalendarService> = new Map();
    private selectedCalendars: Map<string, string[]> = new Map();

    addSource(name: string, service: CalendarService): void {
        this.sources.set(name, service);
    }

    removeSource(name: string): void {
        this.sources.delete(name);
        this.selectedCalendars.delete(name);
    }

    hasSource(name: string): boolean {
        return this.sources.has(name);
    }

    setSelectedCalendars(sourceName: string, calendarIds: string[]): void {
        this.selectedCalendars.set(sourceName, calendarIds);
    }

    async getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
        const allEvents: CalendarEvent[] = [];
        const errors: Error[] = [];

        for (const [name, service] of this.sources) {
            try {
                const isAvailable = await service.isAvailable();
                if (!isAvailable) {
                    console.warn(`Calendar source ${name} is not available`);
                    continue;
                }

                let events = await service.getEvents(startDate, endDate);

                // Filter by selected calendars if any are specified
                const selected = this.selectedCalendars.get(name);
                if (selected && selected.length > 0) {
                    const calendars = await service.getCalendars();
                    const selectedNames = calendars
                        .filter(c => selected.includes(c.id))
                        .map(c => c.name);
                    events = events.filter(e => selectedNames.includes(e.calendarName));
                }

                allEvents.push(...events);
            } catch (error) {
                console.error(`Error fetching events from ${name}:`, error);
                errors.push(error as Error);
            }
        }

        // Sort all events by start date
        allEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        return allEvents;
    }

    async getCalendars(sourceName?: string): Promise<Calendar[]> {
        const allCalendars: Calendar[] = [];

        const sourcesToQuery = sourceName
            ? [[sourceName, this.sources.get(sourceName)]] as [string, CalendarService | undefined][]
            : Array.from(this.sources.entries());

        for (const [name, service] of sourcesToQuery) {
            if (!service) continue;

            try {
                const isAvailable = await service.isAvailable();
                if (!isAvailable) continue;

                const calendars = await service.getCalendars();
                allCalendars.push(...calendars);
            } catch (error) {
                console.error(`Error fetching calendars from ${name}:`, error);
            }
        }

        return allCalendars;
    }

    async getAppleCalendars(): Promise<Calendar[]> {
        return this.getCalendars('apple');
    }
}
