export function ToolIndicator({ tool }: { tool: string }) {
    const label = tool.replace(/_/g, " ");
    return (
        <div className="flex items-center gap-2.5 text-xs px-3 py-2 rounded-xl w-fit"
            style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-3)" }}>
            {/* Animated dots */}
            <div className="flex gap-1 items-center">
                {[0, 160, 320].map((delay) => (
                    <span key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: "var(--accent)", animationDelay: delay + "ms", opacity: 0.7 }} />
                ))}
            </div>
            <span>Using <span className="font-medium" style={{ color: "var(--text-2)" }}>{label}</span>…</span>
        </div>
    );
}
