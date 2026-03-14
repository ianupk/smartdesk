import { cn } from "@/lib/utils";

interface StatsCardProps {
    label: string;
    value: string | number;
    sub?: string;
    accent?: boolean;
    icon?: React.ReactNode;
    className?: string;
}

export function StatsCard({ label, value, sub, accent, icon, className }: StatsCardProps) {
    return (
        <div
            className={cn("rounded-2xl p-5 flex flex-col justify-between transition-all duration-150", className)}
            style={{
                background: "var(--bg-1)",
                border: accent ? "1px solid rgba(217,119,6,0.22)" : "1px solid var(--border)",
                minHeight: 110,
            }}
        >
            {icon && (
                <div style={{ color: accent ? "var(--accent)" : "var(--text-3)" }}>
                    {icon}
                </div>
            )}
            <div className={icon ? "mt-4" : ""}>
                <p
                    className="text-2xl font-bold leading-none tracking-tight"
                    style={{
                        color: accent ? "var(--accent)" : "var(--text)",
                        letterSpacing: "-0.03em",
                    }}
                >
                    {value}
                </p>
                <p className="text-sm font-medium mt-1" style={{ color: "var(--text)" }}>{label}</p>
                {sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{sub}</p>}
            </div>
        </div>
    );
}
