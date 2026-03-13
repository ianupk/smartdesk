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
            const res = await cal.events.insert({
                calendarId: "primary",
                requestBody: {
                    summary: title,
                    description: description ?? "",
                    location: location ?? "",
                    start: { dateTime: startDateTime, timeZone: "UTC" },
                    end: { dateTime: endDateTime, timeZone: "UTC" },
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
                    timeZone: existing.data.start?.timeZone ?? "UTC",
                };
            if (endDateTime)
                patch.end = {
                    dateTime: endDateTime,
                    timeZone: existing.data.end?.timeZone ?? "UTC",
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
            const start = new Date(
                `${date}T${String(workdayStart ?? 9).padStart(2, "0")}:00:00Z`,
            );
            const end = new Date(
                `${date}T${String(workdayEnd ?? 18).padStart(2, "0")}:00:00Z`,
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
                .describe("Workday start hour (UTC, default 9)"),
            workdayEnd: z
                .number()
                .min(0)
                .max(23)
                .default(18)
                .describe("Workday end hour (UTC, default 18)"),
        }),
    },
);
