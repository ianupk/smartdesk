import { Button } from "@/components/ui/Button";

interface InterruptCardProps {
    question: string;
    details: Record<string, unknown>;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}

export function InterruptCard({ question, details, onConfirm, onCancel, loading }: InterruptCardProps) {
    return (
        <div className="rounded-2xl p-4 max-w-md" style={{ background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.2)" }}>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider mb-2" style={{ color: "#eab308" }}>Confirmation Required</p>
            <p className="text-sm mb-3" style={{ color: "var(--text)" }}>{question}</p>
            <div className="rounded-xl p-3 mb-4 space-y-1.5" style={{ background: "var(--bg-3)", border: "1px solid var(--border)" }}>
                {Object.entries(details)
                    .filter(([, v]) => v !== "" && v !== null && (Array.isArray(v) ? v.length > 0 : true))
                    .map(([key, value]) => (
                        <div key={key} className="flex gap-3 text-xs">
                            <span className="font-mono capitalize min-w-[70px] shrink-0" style={{ color: "var(--text-3)" }}>{key}</span>
                            <span style={{ color: "var(--text-2)" }}>{Array.isArray(value) ? value.join(", ") || "..." : String(value)}</span>
                        </div>
                    ))}
            </div>
            <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={onConfirm} loading={loading}>Confirm</Button>
                <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>Cancel</Button>
            </div>
        </div>
    );
}
