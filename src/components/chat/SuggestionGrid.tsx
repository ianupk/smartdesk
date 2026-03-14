"use client";
import { useSession } from "next-auth/react";

// Row 1: 4 chips, Row 2: 2 chips (centered)
const CHIPS_ROW1 = [
    { emoji: "📧", text: "Summarise my last 5 unread emails" },
    { emoji: "📅", text: "What's on my calendar this week?" },
    { emoji: "💬", text: "List my Slack channels" },
    { emoji: "✅", text: "Show my tasks for today" },
];
const CHIPS_ROW2 = [
    { emoji: "🐙", text: "What PRs need my review?" },
    { emoji: "📹", text: "Create a Zoom meeting for tomorrow 10am" },
];

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning.";
    if (h < 17) return "Good afternoon.";
    return "Good evening.";
}

// App icon — exact path from extension_icon.svg
const AppIconMark = () => (
    <svg viewBox="0 0 16 16" fill="none" className="w-6 h-6" style={{ color: "#fff" }}>
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
            d="M3.25 5.25v5.5m7.5-7.5h-5.5m7.5 2v5.5m-2 2h-5.5m6.5-2h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm-9 0h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm0-9h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm9 0h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Z"/>
    </svg>
);

interface SuggestionGridProps {
    onSelect: (text: string) => void;
    inputValue: string;
    onInputChange: (v: string) => void;
    onSend: () => void;
    disabled?: boolean;
}

function Chip({ emoji, text, onSelect }: { emoji: string; text: string; onSelect: (t: string) => void }) {
    return (
        <button
            onClick={() => onSelect(text)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all duration-150 whitespace-nowrap"
            style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-3)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
                (e.currentTarget as HTMLElement).style.color = "var(--text)";
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-2)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
            }}
        >
            <span>{emoji}</span>
            <span>{text}</span>
        </button>
    );
}

export function SuggestionGrid({ onSelect, inputValue, onInputChange, onSend, disabled }: SuggestionGridProps) {
    const canSend = inputValue.trim() && !disabled;

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onInputChange(e.target.value);
        const el = e.currentTarget;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 160) + "px";
    };

    return (
        <div className="flex flex-col items-center justify-center h-full px-4 md:px-8 py-10">

            {/* ── Icon + greeting (centered, same as before) ── */}
            <div className="text-center mb-7 md:mb-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "linear-gradient(135deg, var(--accent), #f59e0b)", boxShadow: "0 8px 32px var(--accent-glow)" }}>
                    <AppIconMark />
                </div>
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-1"
                    style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>
                    {getGreeting()}
                </h2>
                <p className="text-sm" style={{ color: "var(--text-3)" }}>What would you like to do today?</p>
            </div>

            {/* ── Inline input box (max-w matches conversation width) ── */}
            <div className="w-full max-w-2xl mb-6">
                <div className="rounded-2xl overflow-hidden transition-all duration-200"
                    style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
                    onFocusCapture={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.borderColor = "rgba(217,119,6,0.35)";
                        el.style.boxShadow = "0 0 0 3px var(--accent-glow)";
                    }}
                    onBlurCapture={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.borderColor = "var(--border)";
                        el.style.boxShadow = "none";
                    }}
                >
                    {/* Textarea */}
                    <div className="px-5 pt-4 pb-2">
                        <textarea
                            value={inputValue}
                            onChange={handleChange}
                            onKeyDown={handleKey}
                            disabled={disabled}
                            placeholder="Ask SmartDesk anything…"
                            rows={2}
                            className="w-full bg-transparent border-none outline-none resize-none text-[15px] leading-relaxed disabled:opacity-50"
                            style={{ color: "var(--text)", caretColor: "var(--accent)", minHeight: 52, maxHeight: 160 }}
                        />
                    </div>

                    {/* Bottom bar — send button only (no + button) */}
                    <div className="flex items-center justify-end px-4 pb-3 pt-1">
                        <button
                            onClick={onSend}
                            disabled={!canSend}
                            title="Send (Enter)"
                            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150"
                            style={{
                                background: canSend ? "linear-gradient(135deg, var(--accent), #f59e0b)" : "var(--bg-3)",
                                color: canSend ? "#fff" : "var(--text-3)",
                                boxShadow: canSend ? "0 2px 12px var(--accent-glow)" : "none",
                                opacity: canSend ? 1 : 0.4,
                            }}
                            onMouseEnter={e => { if (canSend) (e.currentTarget as HTMLElement).style.transform = "scale(1.08)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                        >
                            {/* Upright arrow-up icon (not tilted) */}
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="19" x2="12" y2="5"/>
                                <polyline points="5 12 12 5 19 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Chips: row 1 = 4, row 2 = 2 centered ── */}
            <div className="w-full max-w-2xl flex flex-col items-center gap-2">
                {/* Row 1 — 4 chips */}
                <div className="flex flex-wrap justify-center gap-2">
                    {CHIPS_ROW1.map(({ emoji, text }) => (
                        <Chip key={text} emoji={emoji} text={text} onSelect={onSelect} />
                    ))}
                </div>
                {/* Row 2 — 2 chips centered */}
                <div className="flex justify-center gap-2">
                    {CHIPS_ROW2.map(({ emoji, text }) => (
                        <Chip key={text} emoji={emoji} text={text} onSelect={onSelect} />
                    ))}
                </div>
            </div>
        </div>
    );
}
