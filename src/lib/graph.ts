import {
    StateGraph,
    MessagesAnnotation,
    START,
    END,
} from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { ChatGroq } from "@langchain/groq";
import { SystemMessage, trimMessages } from "@langchain/core/messages";
import type { CompiledStateGraph } from "@langchain/langgraph";
import { getCheckpointer } from "./checkpointer";
import { listEmailsTool, getEmailBodyTool } from "./tools/gmail";
import {
    listEventsTool,
    checkConflictsTool,
    createEventTool,
} from "./tools/calendar";
import {
    listChannelsTool,
    sendMessageTool,
    announceMeetingTool,
} from "./tools/slack";
import {
    listMeetingsTool,
    createMeetingTool,
    getMeetingTool,
    deleteMeetingTool,
} from "./tools/zoom";
import {
    searchNotionTool,
    getNotionPageTool,
    createNotionPageTool,
    appendToNotionPageTool,
    listNotionDatabasesTool,
} from "./tools/notion";

const ALL_TOOLS = [
    // Gmail
    listEmailsTool,
    getEmailBodyTool,
    // Google Calendar
    listEventsTool,
    checkConflictsTool,
    createEventTool,
    // Slack
    listChannelsTool,
    sendMessageTool,
    announceMeetingTool,
    // Zoom
    listMeetingsTool,
    createMeetingTool,
    getMeetingTool,
    deleteMeetingTool,
    // Notion
    searchNotionTool,
    getNotionPageTool,
    createNotionPageTool,
    appendToNotionPageTool,
    listNotionDatabasesTool,
];

const llm = new ChatGroq({
    model: "llama-3.1-8b-instant",
    temperature: 0,
    apiKey: process.env.GROQ_API_KEY,
    maxTokens: 1024,
}).bindTools(ALL_TOOLS);

const SYSTEM_PROMPT = `You are SmartDesk, an AI assistant with access to Gmail, Google Calendar, Slack, Zoom, and Notion.
Today: ${new Date().toDateString()}.

Available Tools:
- Gmail: list_emails, get_email_body — read and summarise emails
- Calendar: list_calendar_events, check_calendar_conflicts, create_calendar_event — manage schedule
- Slack: list_slack_channels, send_slack_message, schedule_meeting_announcement — send messages
- Zoom: list_zoom_meetings, create_zoom_meeting, get_zoom_meeting, delete_zoom_meeting — manage video meetings
- Notion: search_notion, get_notion_page, create_notion_page, append_to_notion_page, list_notion_databases — manage notes and docs

CRITICAL Rules:
- ALWAYS provide a plain-language response AFTER calling tools — never leave the user with no reply
- After any tool returns data, summarise the results clearly (bullet points are great)
- After create/send/delete actions, confirm what was done
- If a tool returns an error, explain clearly and suggest next steps
- Never call a tool you have no token for — if the user hasn't connected an integration, tell them to go to Dashboard → Integrations
- For Zoom meetings: always call list_zoom_meetings before creating to check for conflicts when relevant
- For Notion: call search_notion first when user wants to read or update an existing page
- Be concise but informative

Example flows:
"show my zoom meetings" → list_zoom_meetings → "You have 3 upcoming meetings: ..."
"create zoom call with team tomorrow 2pm" → create_zoom_meeting (with interrupt) → "Meeting created! Join link: ..."
"find my Q3 notes in Notion" → search_notion → get_notion_page → "Here's what I found: ..."
"add meeting notes to Notion" → create_notion_page → "Notes saved to Notion: ..."
"send slack message to general" → list_slack_channels → send_slack_message → "Sent!"`;

async function agentNode(state: typeof MessagesAnnotation.State) {
    const trimmed = await trimMessages(state.messages, {
        maxTokens: 3000,
        strategy: "last",
        tokenCounter: (msgs) =>
            msgs.reduce(
                (acc, m) =>
                    acc +
                    (typeof m.content === "string"
                        ? m.content.length / 4
                        : 100),
                0,
            ),
        includeSystem: false,
        allowPartial: false,
    });

    const response = await llm.invoke([
        new SystemMessage(SYSTEM_PROMPT),
        ...trimmed,
    ]);
    return { messages: [response] };
}

let _graph: CompiledStateGraph<
    typeof MessagesAnnotation.State,
    Partial<typeof MessagesAnnotation.State>
> | null = null;
let _checkpointer: Awaited<ReturnType<typeof getCheckpointer>> | null = null;

export async function getGraph() {
    if (_graph) return _graph;

    if (!_checkpointer) {
        _checkpointer = await getCheckpointer();
    }

    _graph = new StateGraph(MessagesAnnotation)
        .addNode("agent", agentNode)
        .addNode("tools", new ToolNode(ALL_TOOLS))
        .addEdge(START, "agent")
        .addConditionalEdges("agent", toolsCondition, {
            tools: "tools",
            [END]: END,
        })
        .addEdge("tools", "agent")
        .compile({ checkpointer: _checkpointer });

    console.log(
        "[graph] Graph compiled with Gmail, Calendar, Slack, Zoom, Notion tools",
    );
    return _graph;
}
