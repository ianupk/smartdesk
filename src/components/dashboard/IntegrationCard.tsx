"use client";
import { cn } from "@/lib/utils";

interface IntegrationCardProps {
    name: string;
    description: string;
    detail?: string;
    connected: boolean;
    logo?: React.ReactNode;
    onConnect?: () => void;
    onDisconnect?: () => void;
    className?: string;
}

export function IntegrationCard({
    name, description, detail, connected,
    logo, onConnect, onDisconnect, className,
}: IntegrationCardProps) {
    return (
        <div
            className={cn("flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-100", className)}
            style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-1)"; }}
        >
            {/* Logo */}
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{
                    background: "var(--bg-3)",
                    border: "1px solid var(--border)",
                    opacity: connected ? 1 : 0.35,
                    filter: connected ? "none" : "grayscale(1)",
                }}
            >
                {logo}
            </div>

            {/* Name + description */}
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>{name}</h3>
                <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-3)" }}>{description}</p>
                {detail && <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-3)" }}>{detail}</p>}
            </div>

            {/* Status button */}
            {connected ? (
                <button
                    onClick={onDisconnect}
                    className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
                    style={{
                        background: "rgba(34,197,94,0.10)",
                        border: "1px solid rgba(34,197,94,0.25)",
                        color: "#22c55e",
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)";
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.25)";
                        (e.currentTarget as HTMLElement).style.color = "#ef4444";
                        (e.currentTarget as HTMLElement).textContent = "Disconnect";
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.10)";
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(34,197,94,0.25)";
                        (e.currentTarget as HTMLElement).style.color = "#22c55e";
                        (e.currentTarget as HTMLElement).textContent = "Connected";
                    }}
                >
                    Connected
                </button>
            ) : (
                <button
                    onClick={onConnect}
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-all duration-150"
                    style={{ background: "linear-gradient(135deg, var(--accent), #f59e0b)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px var(--accent-glow)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
                >
                    Connect
                </button>
            )}
        </div>
    );
}
