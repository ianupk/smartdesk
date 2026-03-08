"use client";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export function DashboardHeader() {
    const { data: session } = useSession();

    return (
        <header className="border-b border-border bg-surface-1 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
                <Link href="/dashboard" className="flex items-baseline gap-2">
                    <span className="font-display font-bold text-xl text-ink">
                        SmartDesk
                    </span>
                    <span className="font-mono text-[0.6rem] text-accent tracking-widest">
                        AI
                    </span>
                </Link>

                <nav className="flex items-center gap-6">
                    <Link
                        href="/dashboard"
                        className="text-sm text-ink-dim hover:text-ink transition-colors"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/chat"
                        className="text-sm text-ink-dim hover:text-ink transition-colors"
                    >
                        Chat
                    </Link>
                </nav>

                <div className="flex items-center gap-4">
                    {/* Integration status dots */}
                    <div className="flex items-center gap-1.5">
                        <IntDot
                            label="Gmail"
                            color="#4285F4"
                            letter="G"
                            connected={!!session?.googleAccessToken}
                        />
                        <IntDot
                            label="Calendar"
                            color="#4285F4"
                            letter="C"
                            connected={!!session?.googleAccessToken}
                        />
                        <IntDot
                            label="Slack"
                            color="#4A154B"
                            letter="S"
                            connected={!!session?.hasSlack}
                        />
                        <IntDot
                            label="Zoom"
                            color="#2D8CFF"
                            letter="Z"
                            connected={!!session?.hasZoom}
                        />
                        <IntDot
                            label="Notion"
                            color="#000000"
                            letter="N"
                            connected={!!session?.hasNotion}
                        />
                    </div>

                    <div className="w-px h-6 bg-border" />

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-accent-dim border border-accent/30 flex items-center justify-center text-accent text-sm font-bold">
                                {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                            </div>
                            <div className="text-sm">
                                <p className="font-medium text-ink leading-tight">
                                    {session?.user?.name ?? "User"}
                                </p>
                                <p className="text-[0.7rem] text-ink-muted leading-tight">
                                    {session?.user?.email}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="p-2 rounded-lg text-ink-muted hover:text-danger hover:bg-surface-2 transition-all"
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
                </div>
            </div>
        </header>
    );
}

function IntDot({
    label,
    color,
    letter,
    connected,
}: {
    label: string;
    color: string;
    letter: string;
    connected: boolean;
}) {
    return (
        <div className="relative group">
            <div
                className={`w-6 h-6 rounded flex items-center justify-center text-[0.6rem] font-bold transition-opacity ${connected ? "opacity-100" : "opacity-30"}`}
                style={{ backgroundColor: `${color}22`, color }}
            >
                {letter}
            </div>
            <span
                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-surface-1 ${connected ? "bg-success" : "bg-muted-dim"}`}
            />
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-surface-3 border border-border rounded px-2 py-1 text-[0.7rem] text-ink whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {label}{" "}
                <span className={connected ? "text-success" : "text-muted-dim"}>
                    {connected ? "●" : "○"}
                </span>
            </div>
        </div>
    );
}
