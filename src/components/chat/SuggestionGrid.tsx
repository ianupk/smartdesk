const SUGGESTIONS = [
    { color: "#EA4335", label: "Gmail",    text: "Summarise my last 5 unread emails" },
    { color: "#1a73e8", label: "Calendar", text: "What is on my calendar this week?" },
    { color: "#E01E5A", label: "Slack",    text: "List my Slack channels" },
    { color: "#2D8CFF", label: "Zoom",     text: "Create a Zoom meeting for tomorrow 10am" },
    { color: "#24292e", label: "GitHub",   text: "What PRs need my review?" },
    { color: "#DB4035", label: "Todoist",  text: "Show my tasks for today" },
    { color: "#EA4335", label: "Gmail",    text: "Show emails from my manager" },
    { color: "#24292e", label: "GitHub",   text: "List open issues assigned to me" },
];

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning.";
    if (h < 17) return "Good afternoon.";
    return "Good evening.";
}

// Real app icon — exact path from extension_icon.svg
const AppIconMark = () => (
    <svg viewBox="0 0 16 16" fill="none" className="w-6 h-6" style={{ color: "#fff" }}>
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
            d="M3.25 5.25v5.5m7.5-7.5h-5.5m7.5 2v5.5m-2 2h-5.5m6.5-2h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm-9 0h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm0-9h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm9 0h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Z"/>
    </svg>
);

export function SuggestionGrid({ onSelect }: { onSelect: (text: string) => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full px-4 md:px-8 py-8 md:py-12">
            <div className="text-center mb-8 md:mb-10">
                {/* Amber gradient container matching the header/sidebar brand icon */}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-5"
                    style={{ background: "linear-gradient(135deg, var(--accent), #f59e0b)", boxShadow: "0 8px 32px var(--accent-glow)" }}>
                    <AppIconMark />
                </div>
                <h2 className="text-lg md:text-xl font-semibold mb-1.5 tracking-tight" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>{getGreeting()}</h2>
                <p className="text-sm" style={{ color: "var(--text-3)" }}>What would you like to do today?</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTIONS.map(({ color, label, text }) => (
                    <button
                        key={text}
                        onClick={() => onSelect(text)}
                        className="text-left px-4 py-3.5 rounded-xl transition-all duration-150 group"
                        style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = "var(--bg-3)";
                            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
                            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = "var(--bg-2)";
                            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                            (e.currentTarget as HTMLElement).style.transform = "";
                        }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>{label}</span>
                        </div>
                        <p className="text-[13px] leading-snug" style={{ color: "var(--text-2)" }}>{text}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}
