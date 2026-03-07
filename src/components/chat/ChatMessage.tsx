import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types";

const TOOL_META: Record<string, { label: string; icon: string }> = {
    list_emails: { label: "Gmail", icon: "✉" },
    get_email_body: { label: "Email body", icon: "✉" },
    list_calendar_events: { label: "Calendar", icon: "◈" },
    check_calendar_conflicts: { label: "Conflicts", icon: "◈" },
    create_calendar_event: { label: "New event", icon: "◈" },
    list_slack_channels: { label: "Channels", icon: "◉" },
    send_slack_message: { label: "Slack msg", icon: "◉" },
    schedule_meeting_announcement: { label: "Announcement", icon: "◉" },
};

interface ChatMessageProps {
    message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === "user";

    return (
        <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                    "max-w-[82%] space-y-2",
                    isUser && "items-end flex flex-col",
                )}
            >
                {/* Tool call badges */}
                {!isUser &&
                    message.toolCalls &&
                    message.toolCalls.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {[...new Set(message.toolCalls)].map((tool) => {
                                const meta = TOOL_META[tool];
                                return (
                                    <Badge key={tool} variant="accent">
                                        {meta?.icon}{" "}
                                        {meta?.label ?? tool.replace(/_/g, " ")}
                                    </Badge>
                                );
                            })}
                        </div>
                    )}

                {/* Bubble */}
                <div
                    className={cn(
                        "px-4 py-3 rounded-2xl text-sm",
                        isUser
                            ? "bg-accent text-white rounded-br-sm"
                            : "bg-surface-2 border border-border text-ink-dim rounded-bl-sm",
                    )}
                >
                    {isUser ? (
                        <p className="leading-relaxed">{message.content}</p>
                    ) : (
                        <div className="prose-chat">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Timestamp */}
                <p className="text-[0.6rem] text-ink-muted font-mono px-1">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </p>
            </div>
        </div>
    );
}
