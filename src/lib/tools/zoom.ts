import { tool } from "@langchain/core/tools";
import { interrupt } from "@langchain/langgraph";
import { z } from "zod";
import type { RunnableConfig } from "@langchain/core/runnables";

// Token comes directly from config — no double-refresh.
// The route already calls getZoomToken() once and puts the fresh token in config.
function getToken(config?: RunnableConfig): string {
    const token = config?.configurable?.zoomAccessToken as string | undefined;
    if (!token)
        throw new Error(
            "Zoom is not connected. Please go to Dashboard → Connect Zoom.",
        );
    return token;
}

function zoomError(toolName: string, err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    const friendly: Record<string, string> = {
        invalid_token:
            "Zoom token expired. Please reconnect Zoom from the Dashboard.",
        not_approved: "Zoom app not approved. Re-authorize from the Dashboard.",
        disallow_host_meeting: "You don't have permission to create meetings.",
    };
    for (const [key, val] of Object.entries(friendly)) {
        if (msg.includes(key)) return JSON.stringify({ error: val });
    }
    console.error(`[zoom:${toolName}]`, err);
    return JSON.stringify({ error: msg });
}

async function zoomFetch(
    path: string,
    token: string,
    opts: RequestInit = {},
): Promise<Response> {
    return fetch(`https://api.zoom.us/v2${path}`, {
        ...opts,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...(opts.headers ?? {}),
        },
    });
}

// ── list_zoom_meetings ────────────────────────────────────────────────────────

export const listMeetingsTool = tool(
    async (_: object, config?: RunnableConfig) => {
        try {
            const token = getToken(config);
            const res = await zoomFetch(
                "/users/me/meetings?type=upcoming&page_size=10",
                token,
            );
            if (!res.ok)
                throw new Error(`Zoom API ${res.status}: ${await res.text()}`);
            const data = await res.json();
            const meetings = (data.meetings ?? []).map(
                (m: Record<string, unknown>) => ({
                    id: m.id,
                    topic: m.topic,
                    startTime: m.start_time,
                    duration: `${m.duration} min`,
                    joinUrl: m.join_url,
                    type:
                        m.type === 2
                            ? "Scheduled"
                            : m.type === 1
                              ? "Instant"
                              : "Recurring",
                }),
            );
            return JSON.stringify({ meetings, total: meetings.length });
        } catch (err) {
            return zoomError("list_meetings", err);
        }
    },
    {
        name: "list_zoom_meetings",
        description:
            "List upcoming Zoom meetings. Use when user asks about scheduled Zoom meetings.",
        schema: z.object({
            _unused: z.string().optional().describe("ignored"),
        }),
    },
);

// ── create_zoom_meeting ───────────────────────────────────────────────────────

export const createMeetingTool = tool(
    async (
        {
            topic,
            startTime,
            durationMinutes,
            agenda,
            password,
        }: {
            topic: string;
            startTime?: string;
            durationMinutes?: number;
            agenda?: string;
            password?: string;
        },
        config?: RunnableConfig,
    ) => {
        const confirmed = interrupt({
            question: "Create this Zoom meeting?",
            details: {
                topic,
                startTime: startTime ?? "Instant (now)",
                duration: `${durationMinutes ?? 60} minutes`,
                agenda: agenda ?? "",
            },
        });
        if (!confirmed)
            return JSON.stringify({
                cancelled: true,
                message: "Meeting creation cancelled.",
            });

        try {
            const token = getToken(config);
            const body: Record<string, unknown> = {
                topic,
                type: startTime ? 2 : 1,
                duration: durationMinutes ?? 60,
                timezone: "UTC",
                settings: {
                    host_video: true,
                    participant_video: true,
                    waiting_room: false,
                    join_before_host: true,
                    mute_upon_entry: false,
                    auto_recording: "none",
                },
            };
            if (startTime) body.start_time = startTime;
            if (agenda) body.agenda = agenda;
            if (password) body.password = password;

            const res = await zoomFetch("/users/me/meetings", token, {
                method: "POST",
                body: JSON.stringify(body),
            });
            if (!res.ok)
                throw new Error(`Zoom API ${res.status}: ${await res.text()}`);
            const meeting = await res.json();
            return JSON.stringify({
                success: true,
                meetingId: meeting.id,
                topic: meeting.topic,
                joinUrl: meeting.join_url,
                startUrl: meeting.start_url,
                startTime: meeting.start_time ?? "Now",
                duration: `${meeting.duration} minutes`,
                password: meeting.password ?? null,
            });
        } catch (err) {
            return zoomError("create_meeting", err);
        }
    },
    {
        name: "create_zoom_meeting",
        description:
            "Create a Zoom meeting. Will ask user to confirm first. Returns the join link.",
        schema: z.object({
            topic: z.string().describe("Meeting title/topic"),
            startTime: z
                .string()
                .optional()
                .describe("ISO 8601 start time. Omit for instant meeting."),
            durationMinutes: z.number().min(15).max(480).default(60),
            agenda: z.string().optional(),
            password: z.string().optional(),
        }),
    },
);

// ── get_zoom_meeting ──────────────────────────────────────────────────────────

export const getMeetingTool = tool(
    async ({ meetingId }: { meetingId: string }, config?: RunnableConfig) => {
        try {
            const token = getToken(config);
            const res = await zoomFetch(`/meetings/${meetingId}`, token);
            if (!res.ok)
                throw new Error(`Zoom API ${res.status}: ${await res.text()}`);
            const m = await res.json();
            return JSON.stringify({
                id: m.id,
                topic: m.topic,
                agenda: m.agenda ?? "",
                startTime: m.start_time,
                duration: `${m.duration} minutes`,
                joinUrl: m.join_url,
                startUrl: m.start_url,
                password: m.password ?? null,
                status: m.status,
                participants: m.participants_count ?? 0,
            });
        } catch (err) {
            return zoomError("get_meeting", err);
        }
    },
    {
        name: "get_zoom_meeting",
        description:
            "Get details and join link for a specific Zoom meeting by ID.",
        schema: z.object({
            meetingId: z
                .string()
                .describe("Zoom meeting ID from list_zoom_meetings"),
        }),
    },
);

// ── update_zoom_meeting ───────────────────────────────────────────────────────

export const updateMeetingTool = tool(
    async (
        {
            meetingId,
            topic,
            startTime,
            durationMinutes,
            agenda,
            password,
        }: {
            meetingId: string;
            topic?: string;
            startTime?: string;
            durationMinutes?: number;
            agenda?: string;
            password?: string;
        },
        config?: RunnableConfig,
    ) => {
        const confirmed = interrupt({
            question: "Update this Zoom meeting?",
            details: {
                meetingId,
                topic,
                startTime,
                duration: durationMinutes
                    ? `${durationMinutes} min`
                    : undefined,
            },
        });
        if (!confirmed)
            return JSON.stringify({
                cancelled: true,
                message: "Meeting update cancelled.",
            });

        try {
            const token = getToken(config);
            const body: Record<string, unknown> = {};
            if (topic) body.topic = topic;
            if (startTime) body.start_time = startTime;
            if (durationMinutes) body.duration = durationMinutes;
            if (agenda !== undefined) body.agenda = agenda;
            if (password !== undefined) body.password = password;

            const res = await zoomFetch(`/meetings/${meetingId}`, token, {
                method: "PATCH",
                body: JSON.stringify(body),
            });
            if (!res.ok && res.status !== 204)
                throw new Error(`Zoom API ${res.status}: ${await res.text()}`);
            return JSON.stringify({
                success: true,
                meetingId,
                message: "Meeting updated successfully.",
            });
        } catch (err) {
            return zoomError("update_meeting", err);
        }
    },
    {
        name: "update_zoom_meeting",
        description:
            "Update an existing Zoom meeting — change topic, time, duration, or agenda. Will confirm first.",
        schema: z.object({
            meetingId: z
                .string()
                .describe("Zoom meeting ID from list_zoom_meetings"),
            topic: z.string().optional(),
            startTime: z.string().optional().describe("ISO 8601"),
            durationMinutes: z.number().min(15).max(480).optional(),
            agenda: z.string().optional(),
            password: z.string().optional(),
        }),
    },
);

// ── delete_zoom_meeting ───────────────────────────────────────────────────────

export const deleteMeetingTool = tool(
    async (
        { meetingId, topic }: { meetingId: string; topic?: string },
        config?: RunnableConfig,
    ) => {
        const confirmed = interrupt({
            question: "Delete this Zoom meeting?",
            details: { meetingId, topic: topic ?? meetingId },
        });
        if (!confirmed) return JSON.stringify({ cancelled: true });

        try {
            const token = getToken(config);
            const res = await zoomFetch(`/meetings/${meetingId}`, token, {
                method: "DELETE",
            });
            if (!res.ok && res.status !== 204)
                throw new Error(`Zoom API ${res.status}: ${await res.text()}`);
            return JSON.stringify({
                success: true,
                message: `Meeting "${topic ?? meetingId}" deleted.`,
            });
        } catch (err) {
            return zoomError("delete_meeting", err);
        }
    },
    {
        name: "delete_zoom_meeting",
        description: "Delete a Zoom meeting. Will ask user to confirm first.",
        schema: z.object({
            meetingId: z.string().describe("Zoom meeting ID"),
            topic: z
                .string()
                .optional()
                .describe("Meeting topic for confirmation display"),
        }),
    },
);
