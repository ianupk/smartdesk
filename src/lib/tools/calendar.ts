import { tool } from "@langchain/core/tools";
import { interrupt } from "@langchain/langgraph";
import { z } from "zod";
import { google } from "googleapis";
import type { RunnableConfig } from "@langchain/core/runnables";

const getClient = (token: string) => {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    return google.calendar({ version: "v3", auth });
};

function calError(toolName: string, err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[calendar:${toolName}]`, err);
    return JSON.stringify({ error: msg });
}

// FIX: Helper to get the user's timezone from config, with a sensible fallback.
// Reads config.configurable.timezone first, then DEFAULT_TIMEZONE env var, then "UTC".
function getUserTimezone(config?: RunnableConfig): string {
    return (
        config?.configurable?.timezone ?? process.env.DEFAULT_TIMEZONE ?? "UTC"
    );
}

// FIX: Helper to convert a local hour (e.g. 9 for 9 AM) in a given IANA timezone
// into a UTC Date object. Used by find_free_slots so workday boundaries are
// interpreted in the user's local time rather than UTC.
function localHourToUTCDate(
    dateStr: string,
    hour: number,
    timezone: string,
): Date {
    // Build an ISO string as if it were local time, then use Intl to resolve the
    // actual UTC instant. We do this by formatting a reference date in the target
    // timezone and computing the offset.
    const paddedHour = String(hour).padStart(2, "0");
    // Create a Date from a naive local string, then shift it by the timezone offset.
    const naive = new Date(`${dateStr}T${paddedHour}:00:00`);

    // Get the UTC time that corresponds to `hour` o'clock in `timezone`.
    // Strategy: format the naive date in the target timezone and read the offset.
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });

    // Format the desired local time in the target timezone to get the offset.
    // We pick a reference point: midnight UTC on the requested date.
    const midnightUTC = new Date(`${dateStr}T00:00:00Z`);
    const parts = formatter.formatToParts(midnightUTC);
    const get = (type: string) =>
        parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

    // How many hours is the timezone ahead of / behind midnight UTC on this date?
    const tzHourAtMidnightUTC = get("hour");
    const tzMinuteAtMidnightUTC = get("minute");

    // Offset in minutes between UTC midnight and local midnight:
    // local_midnight_UTC = -(tzHour * 60 + tzMinute)
    const offsetMinutes = -(tzHourAtMidnightUTC * 60 + tzMinuteAtMidnightUTC);

    // The UTC timestamp for local `hour:00` on `dateStr`:
    const targetUTCMs =
        midnightUTC.getTime() +
        hour * 60 * 60 * 1000 -
        offsetMinutes * 60 * 1000;

    return new Date(targetUTCMs);
}

// ── list_calendar_events ──────────────────────────────────────────────────────

export const listEventsTool = tool(
    async ({ days }: { days?: number }, config?: RunnableConfig) => {
        try {
            const token = config?.configurable?.googleAccessToken as string;
            const cal = getClient(token);
            const now = new Date();
            const future = new Date(now.getTime() + (days ?? 7) * 86_400_000);
            const res = await cal.events.list({
                calendarId: "primary",
                timeMin: now.toISOString(),
                timeMax: future.toISOString(),
                singleEvents: true,
                orderBy: "startTime",
                maxResults: 10,
            });
            const events = (res.data.items ?? []).map((e) => ({
                id: e.id,
                title: e.summary ?? "Untitled",
                start: e.start?.dateTime ?? e.start?.date,
                end: e.end?.dateTime ?? e.end?.date,
                location: e.location ?? "",
                attendees: (e.attendees ?? []).map((a) => a.email),
            }));
            return JSON.stringify({ events });
        } catch (err) {
            return calError("list_events", err);
        }
    },
    {
        name: "list_calendar_events",
        description:
            "List upcoming Google Calendar events. Use when user asks what's on their schedule.",
        schema: z.object({
            days: z
                .number()
                .min(1)
                .max(30)
                .default(7)
                .describe("Days ahead to look"),
        }),
    },
);

// ── check_calendar_conflicts ──────────────────────────────────────────────────

export const checkConflictsTool = tool(
    async (
        {
            startDateTime,
            endDateTime,
        }: { startDateTime: string; endDateTime: string },
        config?: RunnableConfig,
    ) => {
        try {
            const token = config?.configurable?.googleAccessToken as string;
            const cal = getClient(token);
            const res = await cal.events.list({
                calendarId: "primary",
                timeMin: startDateTime,
                timeMax: endDateTime,
                singleEvents: true,
            });
            const conflicts = (res.data.items ?? []).map((e) => ({
                title: e.summary,
                start: e.start?.dateTime,
                end: e.end?.dateTime,
            }));
            return JSON.stringify({
                hasConflict: conflicts.length > 0,
                conflicts,
            });
        } catch (err) {
            return calError("check_conflicts", err);
        }
    },
    {
        name: "check_calendar_conflicts",
        description:
            "Check if a time slot has conflicts. Always call before creating an event.",
        schema: z.object({
            startDateTime: z.string().describe("ISO 8601 start time"),
            endDateTime: z.string().describe("ISO 8601 end time"),
        }),
    },
);

// ── create_calendar_event ─────────────────────────────────────────────────────

export const createEventTool = tool(
    async (
        {
            title,
            startDateTime,
            endDateTime,
            description,
            attendeeEmails,
            location,
        }: {
            title: string;
            startDateTime: string;
            endDateTime: string;
            description?: string;
            attendeeEmails?: string[];
            location?: string;
        },
        config?: RunnableConfig,
    ) => {
        const confirmed = interrupt({
            question: "Create this calendar event?",
            details: {
                title,
                start: startDateTime,
                end: endDateTime,
                attendees: attendeeEmails ?? [],
                location: location ?? "",
            },
        });
        if (!confirmed)
            return JSON.stringify({
                cancelled: true,
                message: "Event creation cancelled.",
            });

        try {
            const token = config?.configurable?.googleAccessToken as string;
            const cal = getClient(token);

            // FIX: Use the user's actual timezone instead of hardcoded "UTC".
            // Without this, Google Calendar stores the event in UTC, which shifts
            // the displayed time by the user's UTC offset (e.g. +5:30 for IST).
            const userTimezone = getUserTimezone(config);

            const res = await cal.events.insert({
                calendarId: "primary",
                requestBody: {
                    summary: title,
                    description: description ?? "",
                    location: location ?? "",
                    start: { dateTime: startDateTime, timeZone: userTimezone },
                    end: { dateTime: endDateTime, timeZone: userTimezone },
                    attendees: (attendeeEmails ?? []).map((email) => ({
                        email,
                    })),
                },
                sendUpdates: (attendeeEmails ?? []).length > 0 ? "all" : "none",
            });
            return JSON.stringify({
                success: true,
                eventId: res.data.id,
                title: res.data.summary,
                link: res.data.htmlLink,
            });
        } catch (err) {
            return calError("create_event", err);
        }
    },
    {
        name: "create_calendar_event",
        description:
            "Create a new Google Calendar event. Will ask user to confirm first.",
        schema: z.object({
            title: z.string(),
            startDateTime: z.string().describe("ISO 8601"),
            endDateTime: z.string().describe("ISO 8601"),
            description: z.string().optional(),
            attendeeEmails: z.array(z.string()).optional(),
            location: z.string().optional(),
        }),
    },
);

// ── update_calendar_event ─────────────────────────────────────────────────────

export const updateEventTool = tool(
    async (
        {
            eventId,
            title,
            startDateTime,
            endDateTime,
            description,
            location,
            attendeeEmails,
        }: {
            eventId: string;
            title?: string;
            startDateTime?: string;
            endDateTime?: string;
            description?: string;
            location?: string;
            attendeeEmails?: string[];
        },
        config?: RunnableConfig,
    ) => {
        const confirmed = interrupt({
            question: "Update this calendar event?",
            details: { eventId, title, start: startDateTime, end: endDateTime },
        });
        if (!confirmed)
            return JSON.stringify({
                cancelled: true,
                message: "Event update cancelled.",
            });

        try {
            const token = config?.configurable?.googleAccessToken as string;
            const cal = getClient(token);

            // FIX: Use the user's timezone as the fallback when the existing event
            // has no stored timezone, instead of always falling back to "UTC".
            const userTimezone = getUserTimezone(config);

            // Fetch existing first to patch only changed fields
            const existing = await cal.events.get({
                calendarId: "primary",
                eventId,
            });
            const patch: Record<string, unknown> = {};
            if (title) patch.summary = title;
            if (description !== undefined) patch.description = description;
            if (location !== undefined) patch.location = location;
            if (startDateTime)
                patch.start = {
                    dateTime: startDateTime,
                    timeZone: existing.data.start?.timeZone ?? userTimezone,
                };
            if (endDateTime)
                patch.end = {
                    dateTime: endDateTime,
                    timeZone: existing.data.end?.timeZone ?? userTimezone,
                };
            if (attendeeEmails)
                patch.attendees = attendeeEmails.map((email) => ({ email }));

            const res = await cal.events.patch({
                calendarId: "primary",
                eventId,
                requestBody: patch,
            });
            return JSON.stringify({
                success: true,
                eventId: res.data.id,
                title: res.data.summary,
                message: "Event updated.",
            });
        } catch (err) {
            return calError("update_event", err);
        }
    },
    {
        name: "update_calendar_event",
        description:
            "Update an existing Google Calendar event. Use when user wants to reschedule or edit an event.",
        schema: z.object({
            eventId: z.string().describe("Event ID from list_calendar_events"),
            title: z.string().optional(),
            startDateTime: z.string().optional().describe("ISO 8601"),
            endDateTime: z.string().optional().describe("ISO 8601"),
            description: z.string().optional(),
            location: z.string().optional(),
            attendeeEmails: z.array(z.string()).optional(),
        }),
    },
);

// ── delete_calendar_event ─────────────────────────────────────────────────────

export const deleteEventTool = tool(
    async (
        { eventId, title }: { eventId: string; title?: string },
        config?: RunnableConfig,
    ) => {
        const confirmed = interrupt({
            question: "Delete this calendar event?",
            details: { eventId, title: title ?? eventId },
        });
        if (!confirmed)
            return JSON.stringify({
                cancelled: true,
                message: "Event deletion cancelled.",
            });

        try {
            const token = config?.configurable?.googleAccessToken as string;
            const cal = getClient(token);
            await cal.events.delete({ calendarId: "primary", eventId });
            return JSON.stringify({
                success: true,
                message: `Event "${title ?? eventId}" deleted.`,
            });
        } catch (err) {
            return calError("delete_event", err);
        }
    },
    {
        name: "delete_calendar_event",
        description:
            "Delete a Google Calendar event. Will ask user to confirm first.",
        schema: z.object({
            eventId: z.string().describe("Event ID from list_calendar_events"),
            title: z
                .string()
                .optional()
                .describe("Event title for confirmation display"),
        }),
    },
);

// ── find_free_slots ───────────────────────────────────────────────────────────

export const findFreeSlotsTools = tool(
    async (
        {
            date,
            durationMinutes,
            workdayStart,
            workdayEnd,
        }: {
            date: string;
            durationMinutes: number;
            workdayStart?: number;
            workdayEnd?: number;
        },
        config?: RunnableConfig,
    ) => {
        try {
            const token = config?.configurable?.googleAccessToken as string;
            const cal = getClient(token);

            // FIX: Convert workday start/end hours from the user's local timezone to
            // UTC, instead of appending a literal "Z" which treated them as UTC hours.
            // e.g. workdayStart=9 in IST (UTC+5:30) should query from 03:30 UTC,
            // not from 09:00 UTC (which would be 14:30 IST).
            const userTimezone = getUserTimezone(config);
            const start = localHourToUTCDate(
                date,
                workdayStart ?? 9,
                userTimezone,
            );
            const end = localHourToUTCDate(
                date,
                workdayEnd ?? 18,
                userTimezone,
            );

            const res = await cal.events.list({
                calendarId: "primary",
                timeMin: start.toISOString(),
                timeMax: end.toISOString(),
                singleEvents: true,
                orderBy: "startTime",
            });

            const busy = (res.data.items ?? [])
                .map((e) => ({
                    start: new Date(e.start?.dateTime ?? e.start?.date ?? ""),
                    end: new Date(e.end?.dateTime ?? e.end?.date ?? ""),
                }))
                .sort((a, b) => a.start.getTime() - b.start.getTime());

            // Find gaps
            const freeSlots: {
                start: string;
                end: string;
                duration: number;
            }[] = [];
            let cursor = start;

            for (const event of busy) {
                const gap = (event.start.getTime() - cursor.getTime()) / 60000;
                if (gap >= durationMinutes) {
                    freeSlots.push({
                        start: cursor.toISOString(),
                        end: event.start.toISOString(),
                        duration: Math.floor(gap),
                    });
                }
                if (event.end > cursor) cursor = event.end;
            }
            // Final gap
            const finalGap = (end.getTime() - cursor.getTime()) / 60000;
            if (finalGap >= durationMinutes) {
                freeSlots.push({
                    start: cursor.toISOString(),
                    end: end.toISOString(),
                    duration: Math.floor(finalGap),
                });
            }

            return JSON.stringify({
                date,
                freeSlots: freeSlots.slice(0, 5),
                totalSlots: freeSlots.length,
            });
        } catch (err) {
            return calError("find_free_slots", err);
        }
    },
    {
        name: "find_free_slots",
        description:
            "Find free time slots on a specific day. Use when user asks when they are free, or wants to schedule something.",
        schema: z.object({
            date: z.string().describe("Date in YYYY-MM-DD format"),
            durationMinutes: z
                .number()
                .min(15)
                .default(30)
                .describe("Required slot duration in minutes"),
            workdayStart: z
                .number()
                .min(0)
                .max(23)
                .default(9)
                .describe(
                    "Workday start hour in user's local time (default 9)",
                ),
            workdayEnd: z
                .number()
                .min(0)
                .max(23)
                .default(18)
                .describe("Workday end hour in user's local time (default 18)"),
        }),
    },
);
