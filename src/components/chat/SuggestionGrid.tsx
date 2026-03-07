const SUGGESTIONS = [
    { icon: "✉", text: "Summarise my last 5 unread emails" },
    { icon: "◈", text: "What's on my calendar this week?" },
    { icon: "✉", text: "Show emails from my manager" },
    { icon: "◈", text: "Schedule a standup tomorrow at 10am" },
    { icon: "◉", text: "List my Slack channels" },
    { icon: "◉", text: "Announce today's standup in #general" },
];

export function SuggestionGrid({
    onSelect,
}: {
    onSelect: (text: string) => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center flex-1 px-8 py-12 animate-fade-in">
            <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-2xl bg-accent-dim border border-accent/20 flex items-center justify-center text-2xl mx-auto mb-4">
                    ⚡
                </div>
                <h2 className="font-display text-2xl font-semibold text-ink mb-2">
                    {getGreeting()}
                </h2>
                <p className="text-sm text-ink-muted">
                    What would you like to do today?
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
                {SUGGESTIONS.map(({ icon, text }) => (
                    <button
                        key={text}
                        onClick={() => onSelect(text)}
                        className="group text-left px-4 py-3 rounded-xl border border-border bg-surface-1 hover:bg-surface-2 hover:border-accent/30 transition-all duration-200"
                    >
                        <span className="text-sm text-ink-muted group-hover:text-ink transition-colors">
                            <span className="mr-2 text-xs">{icon}</span>
                            {text}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning.";
    if (h < 17) return "Good afternoon.";
    return "Good evening.";
}
