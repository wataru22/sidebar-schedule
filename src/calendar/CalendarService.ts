import { CalendarEvent, Calendar } from '../types';

export interface CalendarService {
    getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
    getCalendars(): Promise<Calendar[]>;
    isAvailable(): Promise<boolean>;
}
