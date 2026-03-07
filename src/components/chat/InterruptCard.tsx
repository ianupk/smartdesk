import { Button } from "@/components/ui/Button";

interface InterruptCardProps {
    question: string;
    details: Record<string, unknown>;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}

export function InterruptCard({
    question,
    details,
    onConfirm,
    onCancel,
    loading,
}: InterruptCardProps) {
    return (
        <div className="animate-slide-up border border-warning/30 bg-warning/5 rounded-xl p-4 max-w-md">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-warning text-sm">⚠</span>
                <p className="font-mono text-[0.65rem] text-warning uppercase tracking-wider">
                    Confirmation Required
                </p>
            </div>

            <p className="text-sm text-ink mb-3">{question}</p>

            {/* Details table */}
            <div className="bg-surface-2 rounded-lg p-3 mb-4 space-y-1.5 border border-border">
                {Object.entries(details)
                    .filter(
                        ([, v]) =>
                            v !== "" &&
                            v !== null &&
                            (Array.isArray(v) ? v.length > 0 : true),
                    )
                    .map(([key, value]) => (
                        <div key={key} className="flex gap-3 text-xs">
                            <span className="font-mono text-ink-muted capitalize min-w-[70px] shrink-0">
                                {key}
                            </span>
                            <span className="text-ink-dim">
                                {Array.isArray(value)
                                    ? value.join(", ") || "—"
                                    : String(value)}
                            </span>
                        </div>
                    ))}
            </div>

            <div className="flex gap-2">
                <Button
                    variant="primary"
                    size="sm"
                    onClick={onConfirm}
                    loading={loading}
                >
                    ✓ Confirm
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={onCancel}
                    disabled={loading}
                >
                    ✗ Cancel
                </Button>
            </div>
        </div>
    );
}
