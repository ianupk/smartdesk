"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import type { ChatThread } from "@/types";

export function ThreadSidebar() {
    const [threads, setThreads] = useState<ChatThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const params = useParams();
    const router = useRouter();
    const activeId = params?.threadId as string;

    const loadThreads = useCallback(async () => {
        try {
            const res = await fetch("/api/threads");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setThreads(data);
        } catch (err) {
            console.error("[ThreadSidebar] load error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadThreads();
        const interval = setInterval(loadThreads, 30_000);
        return () => clearInterval(interval);
    }, [loadThreads]);

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
            console.error("[ThreadSidebar] create error:", err);
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
            console.error("[ThreadSidebar] delete error:", err);
        }
    };

    return (
        <div className="w-64 bg-surface-1 border-r border-border flex flex-col shrink-0">
            {/* Header */}
            <div className="px-4 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">
                    Conversations
                </h2>
                <button
                    onClick={createThread}
                    disabled={creating}
                    className="w-7 h-7 rounded-md bg-surface-3 hover:bg-surface-4 border border-border flex items-center justify-center text-ink-muted hover:text-accent transition-all disabled:opacity-50"
                    title="New conversation"
                >
                    {creating ? (
                        <Spinner className="w-3 h-3" />
                    ) : (
                        <span className="text-base leading-none">+</span>
                    )}
                </button>
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
                                "group flex items-start gap-2 px-4 py-3 hover:bg-surface-2 transition-all border-l-2",
                                activeId === thread.id
                                    ? "bg-surface-2 border-accent"
                                    : "border-transparent",
                            )}
                        >
                            <div className="flex-1 min-w-0">
                                <p
                                    className={cn(
                                        "text-xs font-medium truncate",
                                        activeId === thread.id
                                            ? "text-ink"
                                            : "text-ink-dim",
                                    )}
                                >
                                    {thread.title}
                                </p>
                                {thread.lastMessage && (
                                    <p className="text-[0.65rem] text-ink-muted truncate mt-0.5">
                                        {thread.lastMessage}
                                    </p>
                                )}
                                <p className="text-[0.6rem] text-muted-dim mt-0.5 font-mono">
                                    {new Date(
                                        thread.updatedAt,
                                    ).toLocaleDateString()}
                                    {thread.messageCount !== undefined &&
                                        ` · ${thread.messageCount} msgs`}
                                </p>
                            </div>
                            <button
                                onClick={(e) => deleteThread(e, thread.id)}
                                className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-danger transition-all mt-0.5 shrink-0"
                                title="Delete"
                            >
                                <svg
                                    className="w-3 h-3"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path
                                        d="M18 6L6 18M6 6l12 12"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </button>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
