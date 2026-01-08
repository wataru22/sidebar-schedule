import { format, isToday, isTomorrow, isThisWeek, startOfDay, addDays, isSameDay } from 'date-fns';

export function formatDateHeader(date: Date): string {
    if (isToday(date)) {
        return 'Today';
    }
    if (isTomorrow(date)) {
        return 'Tomorrow';
    }
    if (isThisWeek(date)) {
        return format(date, 'EEEE'); // Day name
    }
    return format(date, 'EEEE, MMMM d'); // Full date
}

export function formatTime(date: Date, use24Hour: boolean): string {
    if (use24Hour) {
        return format(date, 'HH:mm');
    }
    return format(date, 'h:mm a');
}

export function formatHour(hour: number, use24Hour: boolean): string {
    if (use24Hour) {
        return `${hour.toString().padStart(2, '0')}:00`;
    }
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
}

export function getDateKey(date: Date): string {
    return format(startOfDay(date), 'yyyy-MM-dd');
}

export function getDateRange(daysToShow: number): { startDate: Date; endDate: Date } {
    const startDate = startOfDay(new Date());
    const endDate = addDays(startDate, daysToShow);
    return { startDate, endDate };
}

export function groupEventsByDate<T extends { startDate: Date }>(
    events: T[]
): Map<string, T[]> {
    const grouped = new Map<string, T[]>();

    for (const event of events) {
        const dateKey = getDateKey(event.startDate);
        const existing = grouped.get(dateKey) || [];
        existing.push(event);
        grouped.set(dateKey, existing);
    }

    return grouped;
}

export function eventOverlapsHour(
    eventStart: Date,
    eventEnd: Date,
    hourDate: Date
): boolean {
    const hourStart = new Date(hourDate);
    const hourEnd = new Date(hourDate);
    hourEnd.setHours(hourEnd.getHours() + 1);

    return eventStart < hourEnd && eventEnd > hourStart;
}

export function getEventDurationInHour(
    eventStart: Date,
    eventEnd: Date,
    hourDate: Date
): number {
    const hourStart = new Date(hourDate);
    const hourEnd = new Date(hourDate);
    hourEnd.setHours(hourEnd.getHours() + 1);

    const overlapStart = Math.max(eventStart.getTime(), hourStart.getTime());
    const overlapEnd = Math.min(eventEnd.getTime(), hourEnd.getTime());

    const overlapMinutes = (overlapEnd - overlapStart) / (1000 * 60);
    return Math.max(0, Math.min(1, overlapMinutes / 60));
}

export function generateHourSlots(date: Date, startHour = 0, endHour = 24): Date[] {
    const slots: Date[] = [];
    const baseDate = startOfDay(date);

    for (let hour = startHour; hour < endHour; hour++) {
        const slot = new Date(baseDate);
        slot.setHours(hour);
        slots.push(slot);
    }

    return slots;
}

export function parseDateString(dateStr: string): Date {
    return new Date(dateStr);
}

export { isToday, isTomorrow, isSameDay, startOfDay, addDays };
