"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import type { ChatThread } from "@/types";

export function ModernChatSidebar() {
    const [threads, setThreads] = useState<ChatThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("chatSidebarCollapsed");
            return saved === "true";
        }
        return false;
    });
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const activeId = params?.threadId as string;

    const loadThreads = useCallback(async () => {
        try {
            const res = await fetch("/api/threads");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setThreads(data);
        } catch (err) {
            console.error("[ModernChatSidebar] load error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadThreads();
        const interval = setInterval(loadThreads, 30_000);
        return () => clearInterval(interval);
    }, [loadThreads]);

    // Persist collapsed state
    useEffect(() => {
        localStorage.setItem("chatSidebarCollapsed", String(isCollapsed));
    }, [isCollapsed]);

    const createThread = async () => {
        setCreating(true);
        try {
            const res = await fetch("/api/threads", { method: "POST" });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const thread = await res.json();
            setThreads((prev) => [thread, ...prev]);
            router.push(`/chat/${thread.id}`);
        } catch (err) {
            console.error("[ModernChatSidebar] create error:", err);
            alert("Could not create conversation. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    const deleteThread = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await fetch(`/api/threads/${id}`, { method: "DELETE" });
            setThreads((prev) => prev.filter((t) => t.id !== id));
            if (activeId === id) router.push("/chat");
        } catch (err) {
            console.error("[ModernChatSidebar] delete error:", err);
        }
    };

    return (
        <>
            {/* Sidebar */}
            <div
                className={cn(
                    "bg-surface-1 border-r border-border flex flex-col shrink-0 transition-all duration-300 ease-in-out relative",
                    isCollapsed ? "w-16" : "w-72",
                )}
            >
                {/* Toggle button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={cn(
                        "absolute -right-3 top-6 w-6 h-6 rounded-full bg-surface-2 border border-border flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-3 transition-all z-10 shadow-lg",
                    )}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <svg
                        className={cn(
                            "w-3 h-3 transition-transform duration-300",
                            isCollapsed ? "rotate-180" : "",
                        )}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            d="M15 18l-6-6 6-6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>

                {/* Expanded view */}
                {!isCollapsed && (
                    <>
                        {/* Header */}
                        <div className="px-4 py-4 border-b border-border flex items-center justify-between">
                            <div className="flex items-baseline gap-2">
                                <span className="font-display font-bold text-base text-ink">
                                    SmartDesk
                                </span>
                                <span className="font-mono text-[0.5rem] text-accent tracking-widest">
                                    AI
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/dashboard"
                                    className="w-8 h-8 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border flex items-center justify-center text-ink-muted hover:text-accent transition-all"
                                    title="Go to Dashboard"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path
                                            d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <polyline
                                            points="9 22 9 12 15 12 15 22"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </Link>
                                <button
                                    onClick={createThread}
                                    disabled={creating}
                                    className="w-8 h-8 rounded-lg bg-accent hover:bg-accent/90 flex items-center justify-center text-white transition-all disabled:opacity-50 shadow-sm"
                                    title="New conversation"
                                >
                                    {creating ? (
                                        <Spinner className="w-3.5 h-3.5" />
                                    ) : (
                                        <svg
                                            className="w-4 h-4"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <path
                                                d="M12 5v14M5 12h14"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Thread list */}
                        <div className="flex-1 overflow-y-auto py-2">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Spinner className="w-4 h-4" />
                                </div>
                            ) : threads.length === 0 ? (
                                <div className="px-4 py-6 text-center">
                                    <p className="text-xs text-ink-muted">
                                        No conversations yet.
                                    </p>
                                    <button
                                        onClick={createThread}
                                        className="mt-2 text-xs text-accent hover:underline"
                                    >
                                        Start one →
                                    </button>
                                </div>
                            ) : (
                                threads.map((thread) => (
                                    <Link
                                        key={thread.id}
                                        href={`/chat/${thread.id}`}
                                        className={cn(
                                            "group flex items-start gap-2 px-3 py-2.5 mx-2 rounded-lg hover:bg-surface-2 transition-all",
                                            activeId === thread.id
                                                ? "bg-surface-3 border border-border"
                                                : "",
                                        )}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className={cn(
                                                    "text-sm font-medium truncate",
                                                    activeId === thread.id
                                                        ? "text-ink"
                                                        : "text-ink-dim",
                                                )}
                                            >
                                                {thread.title}
                                            </p>
                                            {thread.lastMessage && (
                                                <p className="text-[0.7rem] text-ink-muted truncate mt-0.5">
                                                    {thread.lastMessage}
                                                </p>
                                            )}
                                            <p className="text-[0.6rem] text-muted-dim mt-1 font-mono">
                                                {new Date(
                                                    thread.updatedAt,
                                                ).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                                {thread.messageCount !==
                                                    undefined &&
                                                    ` · ${thread.messageCount}`}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) =>
                                                deleteThread(e, thread.id)
                                            }
                                            className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-danger transition-all mt-1 shrink-0"
                                            title="Delete conversation"
                                        >
                                            <svg
                                                className="w-3.5 h-3.5"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <path
                                                    d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </button>
                                    </Link>
                                ))
                            )}
                        </div>

                        {/* Integrations */}
                        <div className="px-4 py-3 border-t border-border">
                            <p className="font-mono text-[0.6rem] text-ink-muted uppercase tracking-widest mb-2">
                                Integrations
                            </p>
                            <div className="space-y-1.5">
                                <IntegrationRow
                                    icon="✉"
                                    label="Gmail"
                                    connected={!!session?.googleAccessToken}
                                />
                                <IntegrationRow
                                    icon="◈"
                                    label="Calendar"
                                    connected={!!session?.googleAccessToken}
                                />
                                <IntegrationRow
                                    icon="◉"
                                    label="Slack"
                                    connected={!!session?.hasSlack}
                                />
                            </div>
                        </div>

                        {/* User profile */}
                        <div className="px-4 py-3 border-t border-border flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent-dim border border-accent/30 flex items-center justify-center text-accent text-sm font-bold shrink-0">
                                {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-ink truncate">
                                    {session?.user?.name ?? "User"}
                                </p>
                                <p className="text-[0.7rem] text-ink-muted truncate">
                                    {session?.user?.email}
                                </p>
                            </div>
                            <button
                                onClick={() =>
                                    signOut({ callbackUrl: "/login" })
                                }
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
                    </>
                )}

                {/* Collapsed view */}
                {isCollapsed && (
                    <div className="flex flex-col h-full py-4">
                        {/* Dashboard link */}
                        <div className="px-3 mb-2">
                            <Link
                                href="/dashboard"
                                className="w-10 h-10 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border flex items-center justify-center text-ink-muted hover:text-accent transition-all mx-auto"
                                title="Go to Dashboard"
                            >
                                <svg
                                    className="w-5 h-5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path
                                        d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <polyline
                                        points="9 22 9 12 15 12 15 22"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </Link>
                        </div>

                        {/* New chat button */}
                        <div className="px-3 mb-4">
                            <button
                                onClick={createThread}
                                disabled={creating}
                                className="w-10 h-10 rounded-lg bg-accent hover:bg-accent/90 flex items-center justify-center text-white transition-all disabled:opacity-50 shadow-sm mx-auto"
                                title="New conversation"
                            >
                                {creating ? (
                                    <Spinner className="w-4 h-4" />
                                ) : (
                                    <svg
                                        className="w-5 h-5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path
                                            d="M12 5v14M5 12h14"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                            </button>
                        </div>

                        {/* Integrations icons */}
                        <div className="flex-1 flex flex-col items-center gap-4 py-4 border-t border-border">
                            <IntegrationIcon
                                icon="✉"
                                label="Gmail"
                                connected={!!session?.googleAccessToken}
                            />
                            <IntegrationIcon
                                icon="◈"
                                label="Calendar"
                                connected={!!session?.googleAccessToken}
                            />
                            <IntegrationIcon
                                icon="◉"
                                label="Slack"
                                connected={!!session?.hasSlack}
                            />
                        </div>

                        {/* Profile icon */}
                        <div className="border-t border-border pt-4 px-3">
                            <button
                                className="w-10 h-10 rounded-full bg-accent-dim border border-accent/30 flex items-center justify-center text-accent text-sm font-bold mx-auto hover:bg-accent/20 transition-all"
                                title={
                                    session?.user?.name ??
                                    session?.user?.email ??
                                    "Profile"
                                }
                                onClick={() =>
                                    signOut({ callbackUrl: "/login" })
                                }
                            >
                                {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function IntegrationRow({
    icon,
    label,
    connected,
}: {
    icon: string;
    label: string;
    connected: boolean;
}) {
    return (
        <div className="flex items-center gap-2.5 text-xs">
            <span className="text-sm">{icon}</span>
            <span className="text-ink-muted flex-1">{label}</span>
            <span
                className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    connected ? "bg-success" : "bg-muted-dim",
                )}
            />
        </div>
    );
}

function IntegrationIcon({
    icon,
    label,
    connected,
}: {
    icon: string;
    label: string;
    connected: boolean;
}) {
    return (
        <div className="relative group">
            <div
                className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all border",
                    connected
                        ? "bg-surface-2 border-border text-ink-dim hover:bg-surface-3"
                        : "bg-surface-1 border-border-dim text-muted-dim",
                )}
                title={label}
            >
                {icon}
            </div>
            <span
                className={cn(
                    "absolute top-1 right-1 w-2 h-2 rounded-full border border-surface-1",
                    connected ? "bg-success" : "bg-muted-dim",
                )}
            />
            {/* Tooltip */}
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-surface-3 border border-border rounded px-2 py-1 text-xs text-ink whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {label}
            </div>
        </div>
    );
}
