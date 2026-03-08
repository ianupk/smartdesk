/**
 * Zoom Tools for LangGraph
 *
 * Token flows: session → config.configurable.zoomAccessToken → here
 * Auto-refresh: refreshZoomToken() is called before each API request
 *
 * Most common Zoom use cases covered:
 *   1. List upcoming meetings
 *   2. Create an instant or scheduled meeting (with join link)
 *   3. Get meeting details / join link
 *   4. Delete a meeting
 */

import { tool } from "@langchain/core/tools";
import { interrupt } from "@langchain/langgraph";
import { z } from "zod";
import type { RunnableConfig } from "@langchain/core/runnables";
import { refreshZoomToken } from "@/lib/oauth";

// ── Token helper ──────────────────────────────────────────────────────────────

async function getToken(config?: RunnableConfig): Promise<string> {
  const userId = config?.configurable?.userId as string | undefined;
  const token = config?.configurable?.zoomAccessToken as string | undefined;

  if (!token) {
    throw new Error("Zoom is not connected. Please go to Dashboard → Connect Zoom.");
  }

  // Auto-refresh if we have a userId (server-side context)
  if (userId) {
    const fresh = await refreshZoomToken(userId);
    if (fresh) return fresh;
  }

  return token;
}

function zoomError(toolName: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const friendly: Record<string, string> = {
    "invalid_token": "Zoom token expired. Please reconnect Zoom from the Dashboard.",
    "not_approved": "Zoom app not approved. Re-authorize from the Dashboard.",
    "disallow_host_meeting": "You don't have permission to create meetings.",
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
  opts: RequestInit = {}
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

// ── Tools ─────────────────────────────────────────────────────────────────────

export const listMeetingsTool = tool(
  async (_: object, config?: RunnableConfig) => {
    try {
      const token = await getToken(config);
      const res = await zoomFetch("/users/me/meetings?type=upcoming&page_size=10", token);
      if (!res.ok) throw new Error(`Zoom API ${res.status}: ${await res.text()}`);
      const data = await res.json();

      const meetings = (data.meetings ?? []).map((m: Record<string, unknown>) => ({
        id: m.id,
        topic: m.topic,
        startTime: m.start_time,
        duration: `${m.duration} min`,
        joinUrl: m.join_url,
        type: m.type === 2 ? "Scheduled" : m.type === 1 ? "Instant" : "Recurring",
      }));

      return JSON.stringify({ meetings, total: meetings.length });
    } catch (err) {
      return zoomError("list_meetings", err);
    }
  },
  {
    name: "list_zoom_meetings",
    description:
      "List upcoming Zoom meetings for the user. Use when user asks about scheduled Zoom meetings or wants to see their meeting list.",
    schema: z.object({}),
  }
);

export const createMeetingTool = tool(
  async (
    { topic, startTime, durationMinutes, agenda, password }: {
      topic: string;
      startTime?: string;
      durationMinutes?: number;
      agenda?: string;
      password?: string;
    },
    config?: RunnableConfig
  ) => {
    // Human-in-the-loop confirmation for meeting creation
    const confirmed = interrupt({
      question: "Create this Zoom meeting?",
      details: {
        topic,
        startTime: startTime ?? "Instant (now)",
        duration: `${durationMinutes ?? 60} minutes`,
        agenda: agenda ?? "",
      },
    });
    if (!confirmed) return JSON.stringify({ cancelled: true, message: "Meeting creation cancelled." });

    try {
      const token = await getToken(config);
      const body: Record<string, unknown> = {
        topic,
        type: startTime ? 2 : 1, // 2=scheduled, 1=instant
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

      if (!res.ok) throw new Error(`Zoom API ${res.status}: ${await res.text()}`);
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
      "Create a Zoom meeting. Will ask user to confirm first. Returns the join link. Use when user wants to schedule or start a Zoom meeting.",
    schema: z.object({
      topic: z.string().describe("Meeting title/topic"),
      startTime: z.string().optional().describe("ISO 8601 start time. Omit for instant meeting."),
      durationMinutes: z.number().min(15).max(480).default(60).describe("Duration in minutes"),
      agenda: z.string().optional().describe("Meeting agenda/description"),
      password: z.string().optional().describe("Meeting password (optional)"),
    }),
  }
);

export const getMeetingTool = tool(
  async ({ meetingId }: { meetingId: string }, config?: RunnableConfig) => {
    try {
      const token = await getToken(config);
      const res = await zoomFetch(`/meetings/${meetingId}`, token);
      if (!res.ok) throw new Error(`Zoom API ${res.status}: ${await res.text()}`);
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
      meetingId: z.string().describe("Zoom meeting ID from list_zoom_meetings"),
    }),
  }
);

export const deleteMeetingTool = tool(
  async ({ meetingId, topic }: { meetingId: string; topic?: string }, config?: RunnableConfig) => {
    const confirmed = interrupt({
      question: "Delete this Zoom meeting?",
      details: { meetingId, topic: topic ?? meetingId },
    });
    if (!confirmed) return JSON.stringify({ cancelled: true });

    try {
      const token = await getToken(config);
      const res = await zoomFetch(`/meetings/${meetingId}`, token, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        throw new Error(`Zoom API ${res.status}: ${await res.text()}`);
      }
      return JSON.stringify({ success: true, message: `Meeting ${meetingId} deleted.` });
    } catch (err) {
      return zoomError("delete_meeting", err);
    }
  },
  {
    name: "delete_zoom_meeting",
    description: "Delete a Zoom meeting. Will ask user to confirm first.",
    schema: z.object({
      meetingId: z.string().describe("Zoom meeting ID"),
      topic: z.string().optional().describe("Meeting topic for confirmation display"),
    }),
  }
);
