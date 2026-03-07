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

const SYSTEM_PROMPT = `You are SmartDesk, an AI assistant with Gmail, Google Calendar, and Slack access.
Today: ${new Date().toDateString()}.
Rules:
- Always check_calendar_conflicts before creating events
- Summarise emails with: sender, subject, key point
- Be concise. Use bullet points.
- If a tool returns an {"error": ...} field, report it clearly to the user and stop.`;

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

// Cache graph at module level — persists across requests in the same process
let _graph: CompiledStateGraph<
    typeof MessagesAnnotation.State,
    Partial<typeof MessagesAnnotation.State>
> | null = null;

export async function getGraph() {
    if (_graph) return _graph;
    const checkpointer = await getCheckpointer();
    _graph = new StateGraph(MessagesAnnotation)
        .addNode("agent", agentNode)
        .addNode("tools", new ToolNode(ALL_TOOLS))
        .addEdge(START, "agent")
        .addConditionalEdges("agent", toolsCondition, {
            tools: "tools",
            [END]: END,
        })
        .addEdge("tools", "agent")
        .compile({ checkpointer });
    return _graph;
}
