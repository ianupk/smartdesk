import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface IntegrationCardProps {
    name: string;
    description: string;
    icon: string;
    connected: boolean;
    detail?: string;
    onConnect?: () => void;
    connectLabel?: string;
}

export function IntegrationCard({
    name,
    description,
    icon,
    connected,
    detail,
    onConnect,
    connectLabel,
}: IntegrationCardProps) {
    return (
        <div
            className={cn(
                "card p-5 flex items-start gap-4",
                connected && "border-success/20 bg-success/5",
            )}
        >
            <div className="w-10 h-10 rounded-xl bg-surface-3 border border-border flex items-center justify-center text-xl shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-ink">{name}</h3>
                    <span
                        className={cn(
                            "inline-flex items-center gap-1 text-[0.65rem] font-mono px-1.5 py-0.5 rounded border",
                            connected
                                ? "bg-success/10 border-success/30 text-success"
                                : "bg-surface-3 border-border text-ink-muted",
                        )}
                    >
                        <span
                            className={cn(
                                "w-1 h-1 rounded-full",
                                connected ? "bg-success" : "bg-muted-dim",
                            )}
                        />
                        {connected ? "Connected" : "Not connected"}
                    </span>
                </div>
                <p className="text-xs text-ink-muted">{description}</p>
                {detail && (
                    <p className="text-xs text-ink-dim mt-1">{detail}</p>
                )}
            </div>
            {!connected && onConnect && (
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={onConnect}
                    className="shrink-0"
                >
                    {connectLabel ?? "Connect"}
                </Button>
            )}
        </div>
    );
}
