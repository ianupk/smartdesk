"use client";
import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Spinner } from "@/components/ui/Spinner";
import type { DashboardStats } from "@/types";

function Modal({ title, icon, children, onClose }: {
    title: string; icon: React.ReactNode; children: React.ReactNode; onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#DB4035" }}>{icon}</div>
                    <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{title}</p>
                    <button onClick={onClose} className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-colors" style={{ color: "var(--text-3)", background: "var(--bg-3)" }}>&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
}

const INT_DEFS = [
    {
        id: "google", name: "Google", sub: "Gmail & Calendar", sessionKey: "googleAccessToken",
        logo: <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
        onConnect: () => signIn("google", { callbackUrl: "/dashboard" }),
    },
    {
        id: "slack", name: "Slack", sub: "Team messaging", sessionKey: "hasSlack",
        logo: <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A"/><path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/><path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0"/><path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/><path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#2EB67D"/><path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/><path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E"/><path d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/></svg>,
        onConnect: () => { window.location.href = "/api/slack-connect?action=connect"; },
        onDisconnect: () => { if (confirm("Disconnect Slack?")) window.location.href = "/api/slack-connect?action=disconnect"; },
    },
    {
        id: "zoom", name: "Zoom", sub: "Video meetings", sessionKey: "hasZoom",
        logo: <svg viewBox="0 0 24 24" className="w-5 h-5"><rect width="24" height="24" rx="5" fill="#2D8CFF"/><path d="M14.5 8H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h9.5a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 14.5 8zm4.146 1.269L16 11v2l2.646 1.731A.75.75 0 0 0 20 14.1V9.9a.75.75 0 0 0-1.354-.631z" fill="#fff"/></svg>,
        onConnect: () => { window.location.href = "/api/zoom-connect?action=connect"; },
        onDisconnect: () => { if (confirm("Disconnect Zoom?")) window.location.href = "/api/zoom-connect?action=disconnect"; },
    },
    {
        id: "github", name: "GitHub", sub: "Code & repos", sessionKey: "hasGithub",
        logo: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" style={{ color: "var(--text)" }}><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>,
        onConnect: () => { window.location.href = "/api/github-connect?action=connect"; },
        onDisconnect: () => { if (confirm("Disconnect GitHub?")) window.location.href = "/api/github-connect?action=disconnect"; },
    },
    {
        id: "todoist", name: "Todoist", sub: "Tasks & projects", sessionKey: "hasTodoist",
        logo: <svg viewBox="0 0 24 24" className="w-5 h-5"><circle cx="12" cy="12" r="12" fill="#DB4035"/><path d="M6 8.5l2.5 2.5L14 5M6 12.5l2.5 2.5L14 9M6 16.5l2.5 2.5L14 13" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    },
];

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [newChatLoading, setNewChatLoading] = useState(false);
    const [showTodoistModal, setShowTodoistModal] = useState(false);
    const [todoistToken, setTodoistToken] = useState("");
    const [todoistLoading, setTodoistLoading] = useState(false);
    const [todoistError, setTodoistError] = useState("");
    const [toast, setToast] = useState<string | null>(null);

    const sp = (k: string) => searchParams?.get(k);

    const refreshStats = async () => {
        const r = await fetch("/api/dashboard");
        setStats(await r.json());
    };

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") { router.push("/login"); return; }
        setLoading(true);
        refreshStats().finally(() => setLoading(false));
        if (sp("slack_success") === "1") setToast("Slack connected to " + (sp("team") ?? "workspace"));
        if (sp("zoom_success") === "1") setToast("Zoom connected as " + (sp("name") ?? "Zoom Account"));
        if (sp("github_success") === "1") setToast("GitHub connected as @" + (sp("username") ?? "user"));
        if (sp("zoom_error")) setToast("Zoom error: " + sp("zoom_error"));
        if (sp("github_error")) setToast("GitHub error: " + sp("github_error"));
    }, [status]);

    const newChat = async () => {
        setNewChatLoading(true);
        try {
            const r = await fetch("/api/threads", { method: "POST" });
            const t = await r.json();
            router.push("/chat/" + t.id);
        } catch { alert("Could not create chat."); } finally { setNewChatLoading(false); }
    };

    const handleTodoistConnect = async () => {
        if (!todoistToken.trim()) { setTodoistError("Please paste your API token."); return; }
        setTodoistLoading(true); setTodoistError("");
        try {
            const res = await fetch("/api/todoist-connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "connect", token: todoistToken.trim() }) });
            const data = await res.json();
            if (!res.ok || data.error) { setTodoistError(data.error ?? "Connection failed."); }
            else { setShowTodoistModal(false); setTodoistToken(""); setToast("Todoist connected as " + (data.fullName ?? "user")); await refreshStats(); }
        } catch { setTodoistError("Network error."); } finally { setTodoistLoading(false); }
    };

    const disconnectTodoist = async () => {
        if (!confirm("Disconnect Todoist?")) return;
        await fetch("/api/todoist-connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "disconnect" }) });
        await refreshStats();
    };

    if (status === "loading") return <div className="flex items-center justify-center h-full"><Spinner className="w-5 h-5" /></div>;

    const connected = (p: string) => {
        if (stats?.integrations.some((i) => i.provider === p)) return true;
        // fallback: check session for known keys
        const sessionKeyMap: Record<string, string> = {
            google: "googleAccessToken", slack: "hasSlack", zoom: "hasZoom",
            github: "hasGithub", todoist: "hasTodoist",
        };
        const key = sessionKeyMap[p];
        return key ? !!(session as Record<string, unknown> | null)?.[key] : false;
    };
    const teamName = (p: string) => stats?.integrations.find((i) => i.provider === p)?.teamName;
    const totalConnected = ["google", "slack", "zoom", "github", "todoist"].filter(connected).length;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

    return (
        <div className="h-full flex flex-col" style={{ background: "var(--bg)" }}>
            <DashboardHeader />

            {showTodoistModal && (
                <Modal title="Connect Todoist" icon={<svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M6 8.5l2.5 2.5L14 5M6 12.5l2.5 2.5L14 9M6 16.5l2.5 2.5L14 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>} onClose={() => setShowTodoistModal(false)}>
                    <p className="text-xs mb-3" style={{ color: "var(--text-2)" }}>
                        Get your token at{" "}
                        <a href="https://app.todoist.com/app/settings/integrations/developer" target="_blank" className="underline" style={{ color: "var(--accent)" }}>Todoist Settings</a>
                    </p>
                    <div className="space-y-3">
                        <input type="password" value={todoistToken} onChange={(e) => { setTodoistToken(e.target.value); setTodoistError(""); }}
                            onKeyDown={(e) => e.key === "Enter" && handleTodoistConnect()}
                            placeholder="Your 40-character Todoist API token"
                            className="w-full rounded-xl px-3 py-2.5 text-sm font-mono outline-none"
                            style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)" }}/>
                        {todoistError && <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>{todoistError}</p>}
                        <button onClick={handleTodoistConnect} disabled={todoistLoading}
                            className="w-full py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                            style={{ background: "var(--accent)" }}>
                            {todoistLoading ? "Connecting..." : "Connect Todoist"}
                        </button>
                    </div>
                </Modal>
            )}

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-8 py-10">
                    {toast && (
                        <div className="mb-6 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)", color: "#22c55e" }}>
                            {toast}
                        </div>
                    )}

                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Good {greeting}, {session?.user?.name?.split(" ")[0] ?? "there"}</h1>
                            <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>{totalConnected} of 5 integrations connected</p>
                        </div>
                        <button onClick={newChat} disabled={newChatLoading} className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-opacity" style={{ background: "var(--accent)" }}>
                            {newChatLoading ? "Creating..." : "New Chat"}
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20"><Spinner className="w-5 h-5" /></div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: "Conversations", value: stats?.totalThreads ?? 0 },
                                    { label: "Messages", value: stats?.totalMessages ?? 0 },
                                    { label: "Connected", value: totalConnected + "/5" },
                                ].map((stat) => (
                                    <div key={stat.label} className="rounded-2xl px-5 py-4" style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}>
                                        <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{stat.value}</p>
                                        <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>{stat.label}</p>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>Integrations</p>
                                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                                    {INT_DEFS.map((int, idx) => {
                                        const isConnected = connected(int.id);
                                        const detail = isConnected
                                            ? (int.id === "google" ? "Signed in as " + session?.user?.email : teamName(int.id) ?? "Connected")
                                            : int.sub;
                                        const handleConnect = int.id === "todoist" ? () => setShowTodoistModal(true) : int.onConnect;
                                        const handleDisconnect = int.id === "todoist" ? disconnectTodoist : int.onDisconnect;

                                        return (
                                            <div key={int.id} className="flex items-center gap-4 px-5 py-4"
                                                style={{ background: idx % 2 === 0 ? "var(--bg-1)" : "var(--bg-2)", borderBottom: idx < INT_DEFS.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
                                                <div className={"w-10 h-10 rounded-xl flex items-center justify-center shrink-0 " + (isConnected ? "" : "opacity-25 grayscale")}
                                                    style={{ background: "var(--bg-3)" }}>
                                                    {int.logo}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{int.name}</p>
                                                    <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>{detail}</p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: isConnected ? "#22c55e" : "rgba(255,255,255,0.12)", boxShadow: isConnected ? "0 0 6px rgba(34,197,94,0.5)" : "none" }} />
                                                    {isConnected ? (
                                                        handleDisconnect && (
                                                            <button onClick={handleDisconnect} className="text-xs" style={{ color: "var(--text-3)" }}>Disconnect</button>
                                                        )
                                                    ) : (
                                                        handleConnect && (
                                                            <button onClick={handleConnect} className="text-xs font-medium" style={{ color: "var(--accent)" }}>Connect</button>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {stats && stats.recentThreads.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Recent Chats</p>
                                        <Link href="/chat" className="text-xs" style={{ color: "var(--accent)" }}>View all</Link>
                                    </div>
                                    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                                        {stats.recentThreads.map((t, idx) => (
                                            <Link key={t.id} href={"/chat/" + t.id}
                                                className="flex items-center gap-4 px-5 py-3.5"
                                                style={{ background: idx % 2 === 0 ? "var(--bg-1)" : "var(--bg-2)", borderBottom: idx < stats.recentThreads.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--bg-3)" }}>
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-3)" }}>
                                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{t.title}</p>
                                                    {t.lastMessage && <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>{t.lastMessage}</p>}
                                                </div>
                                                <p className="text-xs shrink-0" style={{ color: "var(--text-3)" }}>
                                                    {new Date(t.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {stats && stats.recentThreads.length === 0 && (
                                <div className="text-center py-16">
                                    <p className="text-sm mb-4" style={{ color: "var(--text-3)" }}>No conversations yet.</p>
                                    <button onClick={newChat} disabled={newChatLoading} className="px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{ background: "var(--accent)" }}>
                                        Start your first chat
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
