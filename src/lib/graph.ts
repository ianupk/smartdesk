import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { ChatGroq } from "@langchain/groq";
import { SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import { getCheckpointer } from "./checkpointer";

// ── Tool imports ──────────────────────────────────────────────────────────────
// GitHub: kept to 1 tool (list repos) — enough to demo, won't overwhelm LLM
import {
    listEmailsTool,
    getEmailBodyTool,
    sendEmailTool,
    replyEmailTool,
    searchEmailsTool,
    markEmailReadTool,
} from "./tools/gmail";
import {
    listEventsTool,
    checkConflictsTool,
    createEventTool,
    deleteEventTool,
    updateEventTool,
    findFreeSlotsTools,
} from "./tools/calendar";
import {
    listChannelsTool,
    sendMessageTool,
    announceMeetingTool,
    readChannelMessagesTool,
    searchSlackTool,
} from "./tools/slack";
import {
    listMeetingsTool,
    createMeetingTool,
    getMeetingTool,
    deleteMeetingTool,
    updateMeetingTool,
} from "./tools/zoom";
import { listReposTool } from "./tools/github";
import {
    listTasksTool,
    createTaskTool,
    completeTaskTool,
    updateTaskTool,
    listProjectsTool,
    deleteTaskTool,
    moveTaskTool,
} from "./tools/todoist";

import { webSearchTool, searchNewsTool } from "./tools/tavily";
// ── Tool registry ─────────────────────────────────────────────────────────────
// Total tools: 21 (down from 38) — comfortably within free-tier LLM limits
export const TOOL_GROUPS = {
    gmail: [listEmailsTool, getEmailBodyTool, sendEmailTool, replyEmailTool, searchEmailsTool, markEmailReadTool],
    calendar: [
        listEventsTool,
        checkConflictsTool,
        createEventTool,
        deleteEventTool,
        updateEventTool,
        findFreeSlotsTools,
    ],
    slack: [listChannelsTool, sendMessageTool, announceMeetingTool, readChannelMessagesTool, searchSlackTool],
    zoom: [listMeetingsTool, createMeetingTool, getMeetingTool, deleteMeetingTool, updateMeetingTool],
    github: [listReposTool],
    todoist: [
        listTasksTool,
        createTaskTool,
        completeTaskTool,
        updateTaskTool,
        listProjectsTool,
        deleteTaskTool,
        moveTaskTool,
    ],
    tavily: [webSearchTool, searchNewsTool],
} as const;

export const ALL_TOOLS = Object.values(TOOL_GROUPS).flat();

// ── Message trimmer ───────────────────────────────────────────────────────────
// Keeps AIMessage(tool_calls) always paired with its ToolMessage(s).
// 14000 chars = safe for Groq free tier (8b: ~8k ctx, 70b: ~32k ctx)
function safeTrimMessages(messages: BaseMessage[], maxChars = 14000): BaseMessage[] {
    type Turn = BaseMessage[];
    const turns: Turn[] = [];
    let i = 0;

    while (i < messages.length) {
        const msg = messages[i];
        const hasToolCalls = msg instanceof AIMessage && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0;

        if (hasToolCalls) {
            const group: BaseMessage[] = [msg];
            let j = i + 1;
            while (j < messages.length && messages[j] instanceof ToolMessage) {
                group.push(messages[j]);
                j++;
            }
            turns.push(group);
            i = j;
        } else {
            turns.push([msg]);
            i++;
        }
    }

    const charCount = (turn: Turn) =>
        turn.reduce((acc, m) => acc + (typeof m.content === "string" ? m.content.length : 200), 0);

    let total = turns.reduce((acc, t) => acc + charCount(t), 0);
    while (total > maxChars && turns.length > 1) {
        const removed = turns.shift()!;
        total -= charCount(removed);
    }

    return turns.flat();
}

// ── Active tools — only inject tools for connected integrations ───────────────
export function getActiveTools(config?: RunnableConfig) {
    const c = config?.configurable ?? {};
    const tools: (typeof ALL_TOOLS)[number][] = [];

    if (c.googleAccessToken) tools.push(...TOOL_GROUPS.gmail, ...TOOL_GROUPS.calendar);
    if (c.slackAccessToken) tools.push(...TOOL_GROUPS.slack);
    if (c.zoomAccessToken) tools.push(...TOOL_GROUPS.zoom);
    if (c.githubAccessToken) tools.push(...TOOL_GROUPS.github);
    if (c.todoistAccessToken) tools.push(...TOOL_GROUPS.todoist);
    if (process.env.TAVILY_API_KEY) tools.push(...TOOL_GROUPS.tavily);

    return tools;
}

// ── System prompt — concise to save Groq tokens ──────────────────────────────
function buildSystemPrompt(activeTools: ReturnType<typeof getActiveTools>, config?: RunnableConfig): string {
    const names = new Set(activeTools.map((t) => t.name));
    const connected: string[] = [];

    if (names.has("list_emails"))
        connected.push(
            "Gmail: list_emails, get_email_body, send_email, reply_to_email, search_emails, mark_email_read",
        );
    if (names.has("list_calendar_events"))
        connected.push(
            "Calendar: list_calendar_events, check_calendar_conflicts, create_calendar_event, update_calendar_event, delete_calendar_event, find_free_slots",
        );
    if (names.has("list_slack_channels"))
        connected.push(
            "Slack: list_slack_channels, send_slack_message, read_channel_messages, search_slack, schedule_meeting_announcement",
        );
    if (names.has("list_zoom_meetings"))
        connected.push(
            "Zoom: list_zoom_meetings, create_zoom_meeting, get_zoom_meeting, update_zoom_meeting, delete_zoom_meeting",
        );
    if (names.has("list_github_repos")) connected.push("GitHub: list_github_repos");
    if (names.has("list_todoist_tasks"))
        connected.push(
            "Todoist: list_todoist_tasks, create_todoist_task, complete_todoist_task, update_todoist_task, delete_todoist_task, move_todoist_task, list_todoist_projects",
        );
    if (names.has("web_search")) connected.push("Tavily: web_search, search_news");

    const toolSection = connected.length
        ? connected.map((s) => `- ${s}`).join("\n")
        : "No integrations connected. Tell user to connect from Dashboard → Integrations.";

    // FIX: Use user's timezone from config for accurate current time context.
    // This ensures the AI constructs ISO 8601 timestamps in the correct local
    // timezone rather than defaulting to UTC when interpreting user requests
    // like "schedule a meeting at 3 PM".
    const userTimezone = (config?.configurable?.timezone as string) ?? process.env.DEFAULT_TIMEZONE ?? "UTC";

    const now = new Date();

    // Compute the UTC offset for the user's timezone (e.g. "+05:30" for IST).
    // We use Intl to get the correct offset for THIS instant (handles DST).
    const offsetFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: userTimezone,
        timeZoneName: "shortOffset",
    });
    const offsetParts = offsetFormatter.formatToParts(now);
    const utcOffsetLabel = offsetParts.find((p) => p.type === "timeZoneName")?.value ?? "UTC"; // e.g. "GMT+5:30"

    // Build a ±HH:MM offset string for ISO 8601 (e.g. "+05:30").
    // Parse the offset minutes from Intl so it's always accurate.
    const localParts = new Intl.DateTimeFormat("en-US", {
        timeZone: userTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).formatToParts(now);
    const gp = (type: string) => localParts.find((p) => p.type === type)?.value ?? "00";
    // Reconstruct a local datetime string, then diff against UTC to get the real offset.
    const localMs = Date.UTC(
        parseInt(gp("year")),
        parseInt(gp("month")) - 1,
        parseInt(gp("day")),
        parseInt(gp("hour")) % 24,
        parseInt(gp("minute")),
        parseInt(gp("second")),
    );
    const totalOffsetMin = Math.round((localMs - now.getTime()) / 60000);
    const sign = totalOffsetMin >= 0 ? "+" : "-";
    const absMin = Math.abs(totalOffsetMin);
    const isoOffset = `${sign}${String(Math.floor(absMin / 60)).padStart(2, "0")}:${String(absMin % 60).padStart(2, "0")}`;

    // The precise current local time as a full ISO 8601 string (e.g. "2026-03-15T11:09:37+05:30").
    // Giving the AI this exact string means it can compute "now + N minutes" by simple
    // arithmetic on the minutes field, instead of parsing a human-readable sentence.
    const nowIso = now
        .toISOString()
        .replace("Z", isoOffset)
        .replace(/T(\d{2}:\d{2}:\d{2})\.\d+/, (_: string, hms: string) => {
            // Replace with local H:M:S (the UTC hours in toISOString are wrong for local time)
            return `T${gp("hour").padStart(2, "0")}:${gp("minute").padStart(2, "0")}:${gp("second").padStart(2, "0")}`;
        });

    return `You are SmartDesk, an AI productivity assistant.
Current time (EXACT): ${nowIso}
Timezone: ${userTimezone} (${utcOffsetLabel})

CRITICAL — time arithmetic rules:
- "now" = ${nowIso} — use this exact timestamp as your reference for ALL relative time expressions.
- "in X minutes" → add X to the minute value of ${nowIso}, carrying over to hours/days as needed.
- "in X hours"   → add X to the hour value, carrying over to days as needed.
- Always double-check your arithmetic before calling a tool.
- All event datetimes MUST include the UTC offset: e.g. "2026-03-15T11:24:00${isoOffset}", NOT ending in "Z".

Available tools:
${toolSection}

Rules:
1. Always use a tool when the user asks about their data (emails, tasks, calendar, repos, etc.).
2. Only call tools listed above — never call tools for disconnected services.
3. Respond in plain language; use bullet points for lists of items.
4. After create/send/delete actions, confirm exactly what was done.
5. If a tool returns an error, explain it clearly and suggest reconnecting from Dashboard.
6. If user asks about a disconnected service, direct them to Dashboard → Integrations.`;
}

// ── LLM factory — Groq free tier ─────────────────────────────────────────────
// llama-3.3-70b-versatile: best tool-calling quality on Groq free tier.
// Override with GROQ_MODEL=llama-3.1-8b-instant in .env to save quota.
function createLLM(tools: ReturnType<typeof getActiveTools>) {
    const llm = new ChatGroq({
        model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
        temperature: 0,
        apiKey: process.env.GROQ_API_KEY,
        maxTokens: 1024, // concise responses, saves free-tier quota
        maxRetries: 1, // fail fast — don't waste time on retries
    });

    return tools.length > 0 ? llm.bindTools(tools) : llm;
}

// ── Agent node ────────────────────────────────────────────────────────────────
async function agentNode(state: typeof MessagesAnnotation.State, config?: RunnableConfig) {
    const activeTools = getActiveTools(config);
    const llm = createLLM(activeTools);
    const trimmed = safeTrimMessages(state.messages);

    const response = await llm.invoke([
        // FIX: Pass config into buildSystemPrompt so it can read the user's timezone
        new SystemMessage(buildSystemPrompt(activeTools, config)),
        ...trimmed,
    ]);

    return { messages: [response] };
}

// ── Graph cache ───────────────────────────────────────────────────────────────
// Graphs are keyed by integration signature (which services are connected).
// Only recompiles when a user connects/disconnects an integration — not every request.
type CachedGraph = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graph: any;
    toolCount: number;
};
const _graphCache = new Map<string, CachedGraph>();
let _checkpointer: Awaited<ReturnType<typeof getCheckpointer>> | null = null;

function getIntegrationKey(config?: RunnableConfig): string {
    const c = config?.configurable ?? {};
    return (
        [
            "w", // Tavily always present
            c.googleAccessToken ? "g" : "",
            c.slackAccessToken ? "s" : "",
            c.zoomAccessToken ? "z" : "",
            c.githubAccessToken ? "gh" : "",
            c.todoistAccessToken ? "t" : "",
        ]
            .filter(Boolean)
            .join("+") || "none"
    );
}

async function getCachedCheckpointer() {
    if (!_checkpointer) {
        _checkpointer = await getCheckpointer();
    }
    return _checkpointer;
}

export async function getGraph(
    config?: RunnableConfig,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
    const checkpointer = await getCachedCheckpointer();
    const activeTools = getActiveTools(config);
    const key = getIntegrationKey(config);

    // Return cached compiled graph if integration set is unchanged
    const cached = _graphCache.get(key);
    if (cached && cached.toolCount === activeTools.length) {
        return cached.graph;
    }

    // Compile fresh graph with the correct ToolNode for this integration set
    const graph = new StateGraph(MessagesAnnotation)
        .addNode("agent", (state, cfg) => agentNode(state, cfg))
        .addNode("tools", new ToolNode(activeTools))
        .addEdge(START, "agent")
        .addConditionalEdges("agent", toolsCondition, {
            tools: "tools",
            [END]: END,
        })
        .addEdge("tools", "agent")
        .compile({ checkpointer });

    _graphCache.set(key, { graph, toolCount: activeTools.length });
    console.log(`[graph] compiled for key="${key}" (${activeTools.length} tools)`);
    return graph;
}
