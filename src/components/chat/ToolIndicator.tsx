const TOOL_META: Record<string, { label: string; icon: string }> = {
    list_emails: { label: "Reading Gmail…", icon: "✉" },
    get_email_body: { label: "Opening email…", icon: "✉" },
    list_calendar_events: { label: "Checking calendar…", icon: "◈" },
    check_calendar_conflicts: { label: "Checking conflicts…", icon: "◈" },
    create_calendar_event: { label: "Creating event…", icon: "◈" },
    list_slack_channels: { label: "Loading channels…", icon: "◉" },
    send_slack_message: { label: "Sending to Slack…", icon: "◉" },
    schedule_meeting_announcement: {
        label: "Posting announcement…",
        icon: "◉",
    },
};

export function ToolIndicator({ tool }: { tool: string }) {
    const meta = TOOL_META[tool] ?? {
        label: tool.replace(/_/g, " ") + "…",
        icon: "◌",
    };

    return (
        <div className="flex items-center gap-3 text-ink-muted text-sm animate-fade-in">
            <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                    <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-accent"
                        style={{
                            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }}
                    />
                ))}
            </div>
            <span className="font-mono text-xs text-accent/80 tracking-wide">
                {meta.icon} {meta.label}
            </span>
            <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
        </div>
    );
}
