export function ToolIndicator({ tool }: { tool: string }) {
    const label = tool.replace(/_/g, " ");
    return (
        <div className="flex items-center gap-2.5 text-xs" style={{ color: "var(--text-3)" }}>
            <div className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                    <span key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: "var(--border)", animationDelay: delay + "ms" }} />
                ))}
            </div>
            <span>Using {label}...</span>
        </div>
    );
}
