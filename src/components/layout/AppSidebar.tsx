"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const NAV = [
    { href: "/dashboard", label: "Dashboard", icon: "⊞" },
    { href: "/chat", label: "Chat", icon: "◎" },
];

export function AppSidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();

    return (
        <aside className="w-56 bg-surface-1 border-r border-border flex flex-col shrink-0">
            {/* Brand */}
            <div className="px-5 py-5 border-b border-border">
                <div className="flex items-baseline gap-2">
                    <span className="font-display font-bold text-lg text-ink">
                        SmartDesk
                    </span>
                    <span className="font-mono text-[0.55rem] text-accent tracking-widest">
                        AI
                    </span>
                </div>
                <p className="text-[0.7rem] text-ink-muted mt-0.5">
                    LangGraph · PostgresSQL
                </p>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {NAV.map(({ href, label, icon }) => {
                    const active =
                        pathname === href || pathname.startsWith(href + "/");
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                                active
                                    ? "bg-accent-dim text-accent border border-accent/20"
                                    : "text-ink-muted hover:text-ink hover:bg-surface-2",
                            )}
                        >
                            <span className="text-base">{icon}</span>
                            <span className="font-medium">{label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Integrations status */}
            <div className="px-5 py-4 border-t border-border space-y-2">
                <p className="font-mono text-[0.6rem] text-ink-muted uppercase tracking-widest mb-3">
                    Integrations
                </p>
                <IntegrationDot
                    label="Gmail"
                    icon="✉"
                    connected={!!session?.googleAccessToken}
                />
                <IntegrationDot
                    label="Calendar"
                    icon="◈"
                    connected={!!session?.googleAccessToken}
                />
                <IntegrationDot
                    label="Slack"
                    icon="◉"
                    connected={!!session?.hasSlack}
                />
            </div>

            {/* User */}
            <div className="px-4 py-4 border-t border-border flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-accent-dim border border-accent/30 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                    {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink truncate">
                        {session?.user?.name ?? "User"}
                    </p>
                    <p className="text-[0.65rem] text-ink-muted truncate">
                        {session?.user?.email}
                    </p>
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="text-ink-muted hover:text-danger transition-colors shrink-0"
                    title="Sign out"
                >
                    <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </div>
        </aside>
    );
}

function IntegrationDot({
    label,
    icon,
    connected,
}: {
    label: string;
    icon: string;
    connected: boolean;
}) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="text-[0.75rem] text-ink-muted">{icon}</span>
            <span className="text-xs text-ink-muted flex-1">{label}</span>
            <span
                className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    connected ? "bg-success" : "bg-muted-dim",
                )}
            />
        </div>
    );
}
