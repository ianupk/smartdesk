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

const ALL_TOOLS = [
    listEmailsTool,
    getEmailBodyTool,
    listEventsTool,
    checkConflictsTool,
    createEventTool,
    listChannelsTool,
    sendMessageTool,
    announceMeetingTool,
];

const llm = new ChatGroq({
    model: "llama-3.1-8b-instant",
    temperature: 0,
    apiKey: process.env.GROQ_API_KEY,
    maxTokens: 1024,
}).bindTools(ALL_TOOLS);

const SYSTEM_PROMPT = `You are SmartDesk, an AI assistant with access to Gmail, Google Calendar, and Slack.
Today: ${new Date().toDateString()}.

Available Tools:
- Gmail: list_emails, get_email_body - for reading emails
- Calendar: list_events, check_calendar_conflicts, create_event - for managing calendar
- Slack: list_slack_channels, send_slack_message, schedule_meeting_announcement - for Slack workspace

CRITICAL Rules:
- ALWAYS provide a response to the user after calling tools
- When user asks about Slack channels - call list_slack_channels then summarize the results
- When user asks about emails - call Gmail tools then summarize what you found
- When user asks about calendar - call Calendar tools then tell the user what you found
- After ANY tool call, you MUST respond with the results in plain language
- If a tool returns data, format it nicely for the user (use bullet points)
- If a tool returns an error, explain the error clearly to the user
- Never leave the user hanging - always respond after using a tool
- Be concise but informative
- If user says "send to slack" or "list channels" - use the appropriate tool then confirm what happened

Example flows:
User: "list slack channels" → Call list_slack_channels → "Here are your Slack channels: • general • random • team"
User: "send hello to general" → Call send_slack_message → "Message sent to #general successfully!"`;

async function agentNode(state: typeof MessagesAnnotation.State) {
    // Keep only last 6 messages to avoid token bloat on long conversations
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

// Cache graph and checkpointer at module level — persists across requests
let _graph: CompiledStateGraph<
    typeof MessagesAnnotation.State,
    Partial<typeof MessagesAnnotation.State>
> | null = null;
let _checkpointer: Awaited<ReturnType<typeof getCheckpointer>> | null = null;

export async function getGraph() {
    if (_graph) return _graph;

    // Cache checkpointer to avoid reconnecting to database
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

    console.log("[graph] Graph compiled and cached");
    return _graph;
}
