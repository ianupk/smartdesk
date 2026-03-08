import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { ChatGroq } from "@langchain/groq";
import { SystemMessage, trimMessages } from "@langchain/core/messages";
import type { CompiledStateGraph } from "@langchain/langgraph";
import { getCheckpointer } from "./checkpointer";
import { listEmailsTool, getEmailBodyTool } from "./tools/gmail";
import { listEventsTool, checkConflictsTool, createEventTool } from "./tools/calendar";
import { listChannelsTool, sendMessageTool, announceMeetingTool } from "./tools/slack";
import { listMeetingsTool, createMeetingTool, getMeetingTool, deleteMeetingTool } from "./tools/zoom";
import { searchNotionTool, getNotionPageTool, createNotionPageTool, appendToNotionPageTool, listNotionDatabasesTool } from "./tools/notion";
import { listReposTool, listPRsTool, listIssuesTool, getPRDetailsTool, createIssueTool } from "./tools/github";
import { listTasksTool, createTaskTool, completeTaskTool, updateTaskTool, listProjectsTool } from "./tools/todoist";
import { webSearchTool, searchNewsTool } from "./tools/tavily";

const ALL_TOOLS = [
  listEmailsTool, getEmailBodyTool,
  listEventsTool, checkConflictsTool, createEventTool,
  listChannelsTool, sendMessageTool, announceMeetingTool,
  listMeetingsTool, createMeetingTool, getMeetingTool, deleteMeetingTool,
  searchNotionTool, getNotionPageTool, createNotionPageTool, appendToNotionPageTool, listNotionDatabasesTool,
  listReposTool, listPRsTool, listIssuesTool, getPRDetailsTool, createIssueTool,
  listTasksTool, createTaskTool, completeTaskTool, updateTaskTool, listProjectsTool,
  webSearchTool, searchNewsTool,
];

const llm = new ChatGroq({
  model: "llama-3.1-8b-instant",
  temperature: 0,
  apiKey: process.env.GROQ_API_KEY,
  maxTokens: 1024,
}).bindTools(ALL_TOOLS);

const SYSTEM_PROMPT = `You are SmartDesk, an AI productivity assistant connected to Gmail, Google Calendar, Slack, Zoom, Notion, GitHub, Todoist, and the web.
Today: ${new Date().toDateString()}.

Available Tools:
- Gmail:     list_emails, get_email_body
- Calendar:  list_calendar_events, check_calendar_conflicts, create_calendar_event
- Slack:     list_slack_channels, send_slack_message, schedule_meeting_announcement
- Zoom:      list_zoom_meetings, create_zoom_meeting, get_zoom_meeting, delete_zoom_meeting
- Notion:    search_notion, get_notion_page, create_notion_page, append_to_notion_page, list_notion_databases
- GitHub:    list_github_repos, list_github_prs, list_github_issues, get_github_pr, create_github_issue
- Todoist:   list_todoist_tasks, create_todoist_task, complete_todoist_task, update_todoist_task, list_todoist_projects
- Web:       web_search, search_news

CRITICAL Rules:
- ALWAYS respond with plain language AFTER any tool call — never leave the user hanging
- Summarise tool results clearly with bullet points when there are multiple items
- After create/send/complete actions, confirm exactly what was done
- If a tool returns an error, explain it clearly and suggest what to do next
- If a user hasn't connected an integration, tell them to go to Dashboard → Integrations
- web_search and search_news require NO connection — they always work if TAVILY_API_KEY is set
- For GitHub: use list_github_prs with role="review-requested" to find PRs needing review
- For Todoist: list_todoist_tasks defaults to today + overdue — the most useful daily view
- For web_search: use it freely for any current facts, news, docs, or research questions

Example flows:
"what PRs need my review" → list_github_prs(role=review-requested) → "3 PRs need your review: ..."
"add task to follow up with client tomorrow" → create_todoist_task(dueString="tomorrow") → "Task created ✓"
"what's the latest news on AI" → search_news(query="AI news") → "Here's the latest: ..."
"show my overdue tasks" → list_todoist_tasks(filter="overdue") → "You have 5 overdue tasks: ..."
"what's my most starred repo" → list_github_repos(sort="updated") → "Your most recently updated repo is..."
"search for React 19 documentation" → web_search(query="React 19 docs") → "Here's what I found: ..."`;

async function agentNode(state: typeof MessagesAnnotation.State) {
  const trimmed = await trimMessages(state.messages, {
    maxTokens: 3000,
    strategy: "last",
    tokenCounter: (msgs) => msgs.reduce((acc, m) => acc + (typeof m.content === "string" ? m.content.length / 4 : 100), 0),
    includeSystem: false,
    allowPartial: false,
  });
  const response = await llm.invoke([new SystemMessage(SYSTEM_PROMPT), ...trimmed]);
  return { messages: [response] };
}

let _graph: CompiledStateGraph<typeof MessagesAnnotation.State, Partial<typeof MessagesAnnotation.State>> | null = null;
let _checkpointer: Awaited<ReturnType<typeof getCheckpointer>> | null = null;

export async function getGraph() {
  if (_graph) return _graph;
  if (!_checkpointer) _checkpointer = await getCheckpointer();
  _graph = new StateGraph(MessagesAnnotation)
    .addNode("agent", agentNode)
    .addNode("tools", new ToolNode(ALL_TOOLS))
    .addEdge(START, "agent")
    .addConditionalEdges("agent", toolsCondition, { tools: "tools", [END]: END })
    .addEdge("tools", "agent")
    .compile({ checkpointer: _checkpointer });
  console.log("[graph] Compiled — Gmail, Calendar, Slack, Zoom, Notion, GitHub, Todoist, Web Search");
  return _graph;
}
