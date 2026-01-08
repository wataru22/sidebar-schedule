import { CalendarEvent, Calendar, GoogleTokens } from '../types';
import { CalendarService } from './CalendarService';
import { requestUrl } from 'obsidian';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

interface GoogleCalendarEvent {
    id: string;
    summary?: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    location?: string;
    description?: string;
}

interface GoogleCalendarListEntry {
    id: string;
    summary: string;
    backgroundColor?: string;
}

export class GoogleCalendarService implements CalendarService {
    private tokens: GoogleTokens | null = null;
    private clientId: string;
    private clientSecret: string;
    public onTokenRefresh?: (tokens: GoogleTokens) => void;

    constructor(clientId: string, clientSecret: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    setTokens(tokens: GoogleTokens): void {
        this.tokens = tokens;
    }

    getTokens(): GoogleTokens | null {
        return this.tokens;
    }

    async isAvailable(): Promise<boolean> {
        return this.tokens !== null && !!this.tokens.access_token;
    }

    private async ensureValidToken(): Promise<string> {
        if (!this.tokens) {
            throw new Error('No tokens available');
        }

        // Check if token is expired (with 5 minute buffer)
        if (this.tokens.expiry_date && Date.now() > this.tokens.expiry_date - 300000) {
            await this.refreshAccessToken();
        }

        return this.tokens.access_token;
    }

    private async refreshAccessToken(): Promise<void> {
        if (!this.tokens?.refresh_token) {
            throw new Error('No refresh token available');
        }

        const response = await requestUrl({
            url: 'https://oauth2.googleapis.com/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: this.tokens.refresh_token,
                grant_type: 'refresh_token',
            }).toString(),
        });

        const data = response.json;

        this.tokens = {
            ...this.tokens,
            access_token: data.access_token,
            expiry_date: Date.now() + data.expires_in * 1000,
        };

        if (this.onTokenRefresh) {
            this.onTokenRefresh(this.tokens);
        }
    }

    async getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
        const accessToken = await this.ensureValidToken();
        const calendars = await this.getCalendars();
        const allEvents: CalendarEvent[] = [];

        for (const calendar of calendars) {
            try {
                const params = new URLSearchParams({
                    timeMin: startDate.toISOString(),
                    timeMax: endDate.toISOString(),
                    singleEvents: 'true',
                    orderBy: 'startTime',
                });

                const response = await requestUrl({
                    url: `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendar.id)}/events?${params}`,
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                const data = response.json;
                const events: GoogleCalendarEvent[] = data.items || [];

                for (const event of events) {
                    const startDateTime = event.start.dateTime || event.start.date;
                    const endDateTime = event.end.dateTime || event.end.date;

                    if (!startDateTime || !endDateTime) continue;

                    allEvents.push({
                        id: event.id,
                        title: event.summary || 'Untitled Event',
                        startDate: new Date(startDateTime),
                        endDate: new Date(endDateTime),
                        isAllDay: !event.start.dateTime,
                        location: event.location,
                        notes: event.description,
                        calendarName: calendar.name,
                        calendarColor: calendar.color,
                        source: 'google' as const,
                    });
                }
            } catch (error) {
                console.error(`Error fetching events from calendar ${calendar.name}:`, error);
            }
        }

        return allEvents;
    }

    async getCalendars(): Promise<Calendar[]> {
        const accessToken = await this.ensureValidToken();

        const response = await requestUrl({
            url: `${CALENDAR_API_BASE}/users/me/calendarList`,
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const data = response.json;
        const items: GoogleCalendarListEntry[] = data.items || [];

        return items.map(item => ({
            id: item.id,
            name: item.summary,
            color: item.backgroundColor,
            source: 'google' as const,
        }));
    }
}
