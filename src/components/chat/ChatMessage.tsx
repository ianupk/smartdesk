import ReactMarkdown from "react-markdown";
import { WifiOff, AlertCircle, Clock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types";

function ErrorIcon({ message }: { message: string }) {
    if (message.includes("connection") || message.includes("reach the server"))
        return <WifiOff className="w-4 h-4 shrink-0" />;
    if (message.includes("overloaded") || message.includes("Too many") || message.includes("taking too long"))
        return <Clock className="w-4 h-4 shrink-0" />;
    if (message.includes("permission") || message.includes("reconnect"))
        return <ShieldAlert className="w-4 h-4 shrink-0" />;
    return <AlertCircle className="w-4 h-4 shrink-0" />;
}

const TOOL_LABELS: Record<string, string> = {
    list_emails: "Gmail",
    get_email_body: "Email body",
    list_calendar_events: "Calendar",
    check_calendar_conflicts: "Conflicts",
    create_calendar_event: "New event",
    list_slack_channels: "Channels",
    send_slack_message: "Slack msg",
    schedule_meeting_announcement: "Announcement",
    list_zoom_meetings: "Zoom",
    create_zoom_meeting: "New meeting",
    list_github_repos: "GitHub",
    list_github_prs: "Pull requests",
    list_github_issues: "Issues",
    create_github_issue: "New issue",
    list_todoist_tasks: "Todoist",
    create_todoist_task: "New task",
    complete_todoist_task: "Complete task",
    web_search: "Web search",
    search_news: "News",
};

export function ChatMessage({ message }: { message: ChatMessageType }) {
    const isUser = message.role === "user";

    return (
        <div className={cn("flex animate-fade-up", isUser ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[82%] space-y-1.5", isUser && "items-end flex flex-col")}>
                {/* Tool call pills */}
                {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {[...new Set(message.toolCalls)].map((tool) => (
                            <span
                                key={tool}
                                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                                style={{
                                    background: "var(--bg-3)",
                                    color: "var(--text-3)",
                                    border: "1px solid var(--border)",
                                }}
                            >
                                {TOOL_LABELS[tool] ?? tool.replace(/_/g, " ")}
                            </span>
                        ))}
                    </div>
                )}

                {/* Bubble */}
                <div
                    className={cn("px-4 py-3 rounded-2xl text-sm leading-relaxed")}
                    style={{
                        background: isUser ? "linear-gradient(135deg, var(--accent), #f59e0b)" : "var(--bg-2)",
                        color: isUser ? "#fff" : "var(--text-2)",
                        border: isUser ? "none" : "1px solid var(--border)",
                        borderBottomRightRadius: isUser ? "5px" : undefined,
                        borderBottomLeftRadius: !isUser ? "5px" : undefined,
                        boxShadow: isUser ? "0 4px 16px var(--accent-glow)" : "none",
                    }}
                >
                    {isUser ? (
                        <p>{message.content}</p>
                    ) : message.isError ? (
                        <p className="flex items-center gap-1.5 text-red-400">
                            <ErrorIcon message={message.content} />
                            {message.content}
                        </p>
                    ) : (
                        <div className="prose-chat">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Timestamp */}
                <p className="text-[10px] px-1" style={{ color: "var(--text-3)" }}>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
            </div>
        </div>
    );
}
