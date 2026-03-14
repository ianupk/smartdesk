"use client";
import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Spinner } from "@/components/ui/Spinner";
import type { DashboardStats } from "@/types";

// Integration logos (SVG icons)
const GoogleLogo = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);
const SlackLogo = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A"/>
        <path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
        <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0"/>
        <path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
        <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#2EB67D"/>
        <path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
        <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E"/>
        <path d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
    </svg>
);
const ZoomLogo = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
        <rect width="24" height="24" rx="5" fill="#2D8CFF"/>
        <path d="M14.5 8H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h9.5a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 14.5 8zm4.146 1.269L16 11v2l2.646 1.731A.75.75 0 0 0 20 14.1V9.9a.75.75 0 0 0-1.354-.631z" fill="#fff"/>
    </svg>
);
const GitHubLogo = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" style={{ color: "var(--text)" }}>
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
);
const TodoistLogo = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
        <circle cx="12" cy="12" r="12" fill="#DB4035"/>
        <path d="M6 8.5l2.5 2.5L14 5M6 12.5l2.5 2.5L14 9M6 16.5l2.5 2.5L14 13" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
);

const INT_DEFS = [
    { id: "google",   name: "Google",   sub: "Gmail & Calendar", sessionKey: "googleAccessToken", Logo: GoogleLogo,  onConnect: () => signIn("google", { callbackUrl: "/dashboard" }), onDisconnect: undefined },
    { id: "slack",    name: "Slack",    sub: "Team messaging",   sessionKey: "hasSlack",          Logo: SlackLogo,   onConnect: () => { window.location.href = "/api/slack-connect?action=connect"; },    onDisconnect: () => { if (confirm("Disconnect Slack?"))   window.location.href = "/api/slack-connect?action=disconnect"; } },
    { id: "zoom",     name: "Zoom",     sub: "Video meetings",   sessionKey: "hasZoom",           Logo: ZoomLogo,    onConnect: () => { window.location.href = "/api/zoom-connect?action=connect"; },     onDisconnect: () => { if (confirm("Disconnect Zoom?"))    window.location.href = "/api/zoom-connect?action=disconnect"; } },
    { id: "github",   name: "GitHub",   sub: "Code & repos",     sessionKey: "hasGithub",         Logo: GitHubLogo,  onConnect: () => { window.location.href = "/api/github-connect?action=connect"; },   onDisconnect: () => { if (confirm("Disconnect GitHub?"))  window.location.href = "/api/github-connect?action=disconnect"; } },
    { id: "todoist",  name: "Todoist",  sub: "Tasks & projects", sessionKey: "hasTodoist",        Logo: TodoistLogo, onConnect: () => { window.location.href = "/api/todoist-connect?action=connect"; },  onDisconnect: () => { if (confirm("Disconnect Todoist?")) window.location.href = "/api/todoist-connect?action=disconnect"; } },
];

// Unified Connected/Disconnect pill button component
function IntStatusBtn({ isConnected, onConnect, onDisconnect }: {
    isConnected: boolean;
    onConnect?: () => void;
    onDisconnect?: () => void;
}) {
    if (!isConnected) {
        return (
            <button
                onClick={onConnect}
                className="flex items-center gap-1.5 text-[12px] font-semibold px-4 py-1.5 rounded-full transition-all duration-150 shrink-0"
                style={{
                    background: "linear-gradient(135deg, var(--accent), #f59e0b)",
                    color: "#fff",
                    boxShadow: "none",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px var(--accent-glow), 0 2px 12px var(--accent-glow)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = ""; }}
            >
                Connect
            </button>
        );
    }

    // FIX 3 — Connected: show "Connected" always; if onDisconnect exists, hover swaps to red "Disconnect"
    // When no onDisconnect (e.g. Google), pill stays green on hover — never blank.
    const canDisconnect = !!onDisconnect;
    return (
        <div className={`relative shrink-0 ${canDisconnect ? "group/pill" : ""}`} style={{ width: 120, height: 32 }}>
            {/* Default: Connected — only fades on hover if Disconnect is available */}
            <span
                className={`absolute inset-0 flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-full transition-all duration-200 pointer-events-none ${canDisconnect ? "group-hover/pill:opacity-0 group-hover/pill:scale-95" : ""}`}
                style={{
                    background: "rgba(34,197,94,0.08)",
                    color: "#22c55e",
                    border: "1px solid rgba(34,197,94,0.2)",
                }}
            >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e", boxShadow: "0 0 5px rgba(34,197,94,0.7)" }} />
                Connected
            </span>

            {/* Hover: Disconnect — only shown when handler exists */}
            {canDisconnect && (
                <button
                    onClick={onDisconnect}
                    className="absolute inset-0 flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-full transition-all duration-200 opacity-0 scale-95 group-hover/pill:opacity-100 group-hover/pill:scale-100"
                    style={{
                        background: "rgba(239,68,68,0.08)",
                        color: "#ef4444",
                        border: "1px solid rgba(239,68,68,0.22)",
                    }}
                >
                    Disconnect
                </button>
            )}
        </div>
    );
}

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [newChatLoading, setNewChatLoading] = useState(false);
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
        if (sp("slack_success") === "1")       setToast("Slack connected to "    + (sp("team")     ?? "workspace"));
        if (sp("slack_success") === "disconnected") setToast("Slack disconnected.");
        if (sp("zoom_success")  === "1")        setToast("Zoom connected as "     + (sp("name")     ?? "Zoom Account"));
        if (sp("zoom_success")  === "disconnected") setToast("Zoom disconnected.");
        if (sp("github_success") === "1")       setToast("GitHub connected as @"  + (sp("username") ?? "user"));
        if (sp("github_success") === "disconnected") setToast("GitHub disconnected.");
        if (sp("todoist_success") === "1")      setToast("Todoist connected as "  + (sp("name")     ?? "user"));
        if (sp("todoist_success") === "disconnected") setToast("Todoist disconnected.");
        if (sp("zoom_error"))    setToast("Zoom error: "    + sp("zoom_error"));
        if (sp("github_error"))  setToast("GitHub error: "  + sp("github_error"));
        if (sp("slack_error"))   setToast("Slack error: "   + sp("slack_error"));
        if (sp("todoist_error")) setToast("Todoist error: " + sp("todoist_error"));
    }, [status]);

    const newChat = async () => {
        setNewChatLoading(true);
        try {
            const r = await fetch("/api/threads", { method: "POST" });
            const t = await r.json();
            router.push("/chat/" + t.id);
        } catch { alert("Could not create chat."); }
        finally { setNewChatLoading(false); }
    };

    if (status === "loading") return (
        <div className="flex items-center justify-center h-full"><Spinner className="w-5 h-5" /></div>
    );

    const connected = (p: string) => {
        if (stats?.integrations.some((i) => i.provider === p)) return true;
        const keyMap: Record<string, string> = { google: "googleAccessToken", slack: "hasSlack", zoom: "hasZoom", github: "hasGithub", todoist: "hasTodoist" };
        const key = keyMap[p];
        return key ? !!(session as Record<string, unknown> | null)?.[key] : false;
    };
    const teamName = (p: string) => stats?.integrations.find((i) => i.provider === p)?.teamName;
    const totalConnected = ["google","slack","zoom","github","todoist"].filter(connected).length;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

    // Stat cards config
    const STATS = [
        {
            label: "Conversations", value: stats?.totalThreads ?? 0, accent: false,
            icon: (
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
            ),
        },
        {
            label: "Messages", value: stats?.totalMessages ?? 0, accent: false,
            icon: (
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
            ),
        },
        {
            label: "Connected", value: `${totalConnected}/5`, accent: true,
            icon: (
                /* FIX 7 — plug/connections icon, relevant to "integrations connected" */
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 2v3M14 2v3M8 21v-1a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v1M12 12a3 3 0 0 0 3-3V5H9v4a3 3 0 0 0 3 3z"/>
                </svg>
            ),
        },
    ];

    return (
        <div className="h-full flex flex-col" style={{ background: "var(--bg)" }}>
            <DashboardHeader />

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">

                    {/* Toast */}
                    {toast && (
                        <div className="mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-3"
                            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.18)", color: "#22c55e" }}>
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            {toast}
                        </div>
                    )}

                    {/* Hero row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 md:mb-10">
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>
                                Good {greeting}, {session?.user?.name?.split(" ")[0] ?? "there"}
                            </h1>
                            <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
                                {totalConnected} of 5 integrations active
                            </p>
                        </div>

                        {/* New Chat button */}
                        <button
                            onClick={newChat}
                            disabled={newChatLoading}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all disabled:opacity-50 shrink-0"
                            style={{ background: "var(--bg-3)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-3)"; (e.currentTarget as HTMLElement).style.color = "var(--text-2)"; }}
                        >
                            {newChatLoading ? <Spinner className="w-4 h-4" /> : (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            )}
                            New Chat
                            <span className="hidden sm:flex items-center gap-0.5 select-none">
                                <span className="inline-flex items-center justify-center rounded px-1 py-0.5 text-[10px] font-medium leading-none"
                                    style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-3)", minWidth: 18 }}>⌘</span>
                                <span className="inline-flex items-center justify-center rounded px-1 py-0.5 text-[10px] font-medium leading-none"
                                    style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-3)", minWidth: 18 }}>K</span>
                            </span>
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-24"><Spinner className="w-5 h-5" /></div>
                    ) : (
                        <div className="space-y-8">

                            {/* ── Stats cards — fully consistent size/padding/layout ── */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {STATS.map((stat) => (
                                    <div
                                        key={stat.label}
                                        className="rounded-2xl p-4 md:p-5 flex sm:flex-col flex-row sm:justify-between items-center sm:items-start gap-4 sm:gap-0 transition-all duration-150"
                                        style={{
                                            background: "var(--bg-1)",
                                            border: stat.accent
                                                ? "1px solid rgba(217,119,6,0.22)"
                                                : "1px solid var(--border)",
                                            minHeight: 100,
                                        }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = stat.accent ? "rgba(217,119,6,0.4)" : "rgba(255,255,255,0.12)"}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = stat.accent ? "rgba(217,119,6,0.22)" : "var(--border)"}
                                    >
                                        {/* Icon */}
                                        <div className="shrink-0" style={{ color: stat.accent ? "var(--accent)" : "var(--text-3)" }}>
                                            {stat.icon}
                                        </div>
                                        {/* Value + label */}
                                        <div className="sm:mt-4">
                                            <p className="text-2xl md:text-[26px] font-bold leading-none tracking-tight"
                                                style={{ color: stat.accent ? "var(--accent)" : "var(--text)", letterSpacing: "-0.03em" }}>
                                                {stat.value}
                                            </p>
                                            <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                                                {stat.label}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Integrations ── */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Integrations</p>
                                    <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{totalConnected} active</span>
                                </div>
                                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                                    {INT_DEFS.map((int, idx) => {
                                        const isConnected = connected(int.id);
                                        const detail = isConnected
                                            ? (int.id === "google" ? "Signed in as " + session?.user?.email : (teamName(int.id) ?? "Connected"))
                                            : int.sub;
                                        return (
                                            <div
                                                key={int.id}
                                                className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-4 transition-all duration-100"
                                                style={{
                                                    background: "var(--bg-1)",
                                                    borderBottom: idx < INT_DEFS.length - 1 ? "1px solid var(--border-soft)" : "none",
                                                }}
                                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"}
                                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-1)"}
                                            >
                                                {/* Logo */}
                                                <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center shrink-0"
                                                    style={{
                                                        background: "var(--bg-3)",
                                                        opacity: isConnected ? 1 : 0.3,
                                                        filter: isConnected ? "none" : "grayscale(1)",
                                                    }}>
                                                    <int.Logo />
                                                </div>

                                                {/* Name + detail */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{int.name}</p>
                                                    <p className="text-xs truncate mt-0.5 hidden sm:block" style={{ color: "var(--text-3)" }}>{detail}</p>
                                                </div>

                                                {/* Unified connected/disconnect pill */}
                                                <IntStatusBtn
                                                    isConnected={isConnected}
                                                    onConnect={int.onConnect}
                                                    onDisconnect={int.onDisconnect}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Recent chats ── */}
                            {stats && stats.recentThreads.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Recent Chats</p>
                                        <Link href="/chat" className="text-[11px] font-medium transition-opacity hover:opacity-70"
                                            style={{ color: "var(--accent)" }}>
                                            View all →
                                        </Link>
                                    </div>
                                    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                                        {stats.recentThreads.map((t, idx) => (
                                            <Link
                                                key={t.id}
                                                href={"/chat/" + t.id}
                                                className="flex items-center gap-4 px-5 py-3.5 transition-all duration-100 group"
                                                style={{
                                                    background: "var(--bg-1)",
                                                    borderBottom: idx < stats.recentThreads.length - 1 ? "1px solid var(--border-soft)" : "none",
                                                }}
                                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"}
                                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-1)"}
                                            >
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{ background: "var(--bg-3)", border: "1px solid var(--border)" }}>
                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-3)" }}>
                                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{t.title}</p>
                                                    {t.lastMessage && (
                                                        <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-3)" }}>{t.lastMessage}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                                                        {new Date(t.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                    </p>
                                                    <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-3)" }}>
                                                        <polyline points="9 18 15 12 9 6"/>
                                                    </svg>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Empty state ── */}
                            {stats && stats.recentThreads.length === 0 && (
                                <div className="text-center py-20">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                                        style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}>
                                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-3)" }}>
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                        </svg>
                                    </div>
                                    <p className="text-sm font-medium mb-1" style={{ color: "var(--text-2)" }}>No conversations yet</p>
                                    <p className="text-xs mb-6" style={{ color: "var(--text-3)" }}>Start chatting with your AI assistant</p>
                                    <button
                                        onClick={newChat}
                                        disabled={newChatLoading}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all duration-150"
                                        style={{ background: "linear-gradient(135deg, var(--accent), #f59e0b)" }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px var(--accent-glow)"; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 5v14M5 12h14"/>
                                        </svg>
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
