const SUGGESTIONS = [
    { color: "#EA4335", label: "Gmail", text: "Summarise my last 5 unread emails" },
    { color: "#1a73e8", label: "Calendar", text: "What is on my calendar this week?" },
    { color: "#E01E5A", label: "Slack", text: "List my Slack channels" },
    { color: "#2D8CFF", label: "Zoom", text: "Create a Zoom meeting for tomorrow 10am" },
    { color: "#24292e", label: "GitHub", text: "What PRs need my review?" },
    { color: "#DB4035", label: "Todoist", text: "Show my tasks for today" },
    { color: "#EA4335", label: "Gmail", text: "Show emails from my manager" },
    { color: "#24292e", label: "GitHub", text: "List open issues assigned to me" },
];

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning.";
    if (h < 17) return "Good afternoon.";
    return "Good evening.";
}

export function SuggestionGrid({ onSelect }: { onSelect: (text: string) => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full px-8 py-12">
            <div className="text-center mb-10">
                <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>{getGreeting()}</h2>
                <p className="text-sm" style={{ color: "var(--text-3)" }}>What would you like to do today?</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 w-full max-w-lg">
                {SUGGESTIONS.map(({ color, label, text }) => (
                    <button key={text} onClick={() => onSelect(text)}
                        className="group text-left px-4 py-3.5 rounded-xl transition-all"
                        style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                            <span className="text-[0.65rem] font-medium" style={{ color: "var(--text-3)" }}>{label}</span>
                        </div>
                        <p className="text-sm" style={{ color: "var(--text-2)" }}>{text}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}
