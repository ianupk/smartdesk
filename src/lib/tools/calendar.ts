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

export const listEventsTool = tool(
    async ({ days }: { days?: number }, config?: RunnableConfig) => {
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
    },
    {
        name: "list_calendar_events",
        description: "List upcoming Google Calendar events.",
        schema: z.object({
            days: z.number().min(1).max(30).default(7).describe("Days ahead"),
        }),
    },
);

export const checkConflictsTool = tool(
    async (
        {
            startDateTime,
            endDateTime,
        }: { startDateTime: string; endDateTime: string },
        config?: RunnableConfig,
    ) => {
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
        return JSON.stringify({ hasConflict: conflicts.length > 0, conflicts });
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
        // Human-in-the-loop confirmation
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
                attendees: (attendeeEmails ?? []).map((email) => ({ email })),
            },
            sendUpdates: (attendeeEmails ?? []).length > 0 ? "all" : "none",
        });
        return JSON.stringify({
            success: true,
            eventId: res.data.id,
            title: res.data.summary,
            link: res.data.htmlLink,
        });
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
