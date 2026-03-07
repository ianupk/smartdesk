import { cn } from "@/lib/utils";

interface StatsCardProps {
    label: string;
    value: string | number;
    icon: string;
    sub?: string;
    accent?: boolean;
}

export function StatsCard({ label, value, icon, sub, accent }: StatsCardProps) {
    return (
        <div
            className={cn(
                "card p-5 space-y-3",
                accent && "border-accent/30 bg-accent-dim",
            )}
        >
            <div className="flex items-center justify-between">
                <span className="text-lg">{icon}</span>
                <span
                    className={cn(
                        "font-display text-2xl font-bold",
                        accent ? "text-accent" : "text-ink",
                    )}
                >
                    {value}
                </span>
            </div>
            <div>
                <p className="text-sm font-medium text-ink">{label}</p>
                {sub && <p className="text-xs text-ink-muted mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}
