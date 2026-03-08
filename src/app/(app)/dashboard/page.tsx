"use client";
import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { DashboardStats } from "@/types";

const ERRORS: Record<string, Record<string, string>> = {
    slack: {
        missing_token:
            "SLACK_BOT_TOKEN not set in .env.local — add it and restart Docker.",
        invalid_token_format:
            "Token must start with xoxb-. Check SLACK_BOT_TOKEN.",
        invalid_auth:
            "Invalid token. Copy the correct Bot Token from api.slack.com.",
        token_revoked:
            "Token revoked. Re-install the Slack app to get a new token.",
        missing_scope:
            "Missing scopes. Add chat:write, channels:read, groups:read.",
    },
    zoom: {
        missing_config:
            "ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET not set in .env.local.",
        token_exchange_failed:
            "Token exchange failed. Check your Zoom app credentials.",
        access_denied:
            "Zoom access denied. Please allow the permissions requested.",
    },
    github: {
        missing_config:
            "GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET not set in .env.local.",
        token_exchange_failed:
            "Token exchange failed. Check your GitHub OAuth app credentials.",
        access_denied: "GitHub access denied.",
    },
    todoist: {
        missing_config:
            "TODOIST_CLIENT_ID / TODOIST_CLIENT_SECRET not set in .env.local.",
        token_exchange_failed:
            "Token exchange failed. Check your Todoist app credentials.",
        access_denied: "Todoist access denied.",
    },
};

function NotionTokenModal({
    onClose,
    onConnected,
}: {
    onClose: () => void;
    onConnected: (ws: string) => void;
}) {
    const [token, setToken] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleConnect = async () => {
        if (!token.trim()) {
            setError("Please paste your token.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/notion-connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "connect",
                    token: token.trim(),
                }),
            });
            const data = await res.json();
            if (!res.ok || data.error)
                setError(data.error ?? "Connection failed.");
            else onConnected(data.workspaceName ?? "Notion Workspace");
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-surface-1 border border-border rounded-xl w-full max-w-md p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-lg bg-[#191919] flex items-center justify-center text-white font-bold text-sm">
                        N
                    </div>
                    <div>
                        <h2 className="font-semibold text-ink text-sm">
                            Connect Notion
                        </h2>
                        <p className="text-xs text-ink-muted">
                            Paste your Internal Integration Secret
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-auto text-ink-muted hover:text-ink text-xl leading-none"
                    >
                        ×
                    </button>
                </div>
                <div className="bg-surface-2 rounded-lg p-4 mb-4">
                    <p className="text-xs font-semibold text-ink mb-2">
                        How to get your token:
                    </p>
                    <ol className="space-y-1.5 text-xs text-ink-dim list-decimal list-inside leading-relaxed">
                        <li>
                            Go to{" "}
                            <a
                                href="https://www.notion.so/profile/integrations"
                                target="_blank"
                                className="text-accent underline"
                            >
                                notion.so/profile/integrations
                            </a>
                        </li>
                        <li>
                            New integration → name it (e.g. SmartDesk) → Submit
                        </li>
                        <li>
                            Open the <strong>Secrets</strong> tab → copy the{" "}
                            <strong>Internal Integration Secret</strong>
                        </li>
                        <li>Paste below → Connect</li>
                        <li className="text-amber-600 font-medium">
                            After connecting: In Notion open each page → ··· →
                            Add connections → select your integration
                        </li>
                    </ol>
                </div>
                <div className="space-y-3">
                    <input
                        type="password"
                        value={token}
                        onChange={(e) => {
                            setToken(e.target.value);
                            setError("");
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                        placeholder="secret_xxxxxxxxxxxxxxxx"
                        autoFocus
                        className="w-full bg-surface-3 border border-border rounded-lg px-3 py-2.5 text-sm text-ink font-mono placeholder:text-ink-muted focus:outline-none focus:border-accent"
                    />
                    {error && (
                        <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleConnect}
                            loading={loading}
                            className="flex-1"
                        >
                            Connect Notion
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TodoistTokenModal({
    onClose,
    onConnected,
}: {
    onClose: () => void;
    onConnected: (name: string) => void;
}) {
    const [token, setToken] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleConnect = async () => {
        if (!token.trim()) {
            setError("Please paste your API token.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/todoist-connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "connect",
                    token: token.trim(),
                }),
            });
            const data = await res.json();
            if (!res.ok || data.error)
                setError(data.error ?? "Connection failed.");
            else onConnected(data.fullName ?? "Todoist");
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-surface-1 border border-border rounded-xl w-full max-w-md p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-lg bg-[#DB4035] flex items-center justify-center text-white font-bold text-sm">
                        ✓
                    </div>
                    <div>
                        <h2 className="font-semibold text-ink text-sm">
                            Connect Todoist
                        </h2>
                        <p className="text-xs text-ink-muted">
                            Paste your Personal API Token
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-auto text-ink-muted hover:text-ink text-xl leading-none"
                    >
                        ×
                    </button>
                </div>
                <div className="bg-surface-2 rounded-lg p-4 mb-4">
                    <p className="text-xs font-semibold text-ink mb-2">
                        How to get your token (30 seconds):
                    </p>
                    <ol className="space-y-1.5 text-xs text-ink-dim list-decimal list-inside leading-relaxed">
                        <li>
                            Open{" "}
                            <a
                                href="https://app.todoist.com/app/settings/integrations/developer"
                                target="_blank"
                                className="text-accent underline"
                            >
                                Todoist → Settings → Integrations → Developer
                            </a>
                        </li>
                        <li>
                            Scroll down to <strong>API token</strong> — copy it
                        </li>
                        <li>Paste below and click Connect</li>
                    </ol>
                </div>
                <div className="space-y-3">
                    <input
                        type="password"
                        value={token}
                        onChange={(e) => {
                            setToken(e.target.value);
                            setError("");
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                        placeholder="Your 40-character Todoist API token"
                        autoFocus
                        className="w-full bg-surface-3 border border-border rounded-lg px-3 py-2.5 text-sm text-ink font-mono placeholder:text-ink-muted focus:outline-none focus:border-accent"
                    />
                    {error && (
                        <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleConnect}
                            loading={loading}
                            className="flex-1"
                        >
                            Connect Todoist
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function IntCard({
    icon,
    iconBg,
    iconText,
    name,
    subtitle,
    capabilities,
    connected,
    detail,
    onConnect,
    onDisconnect,
    setupGuide,
}: {
    icon?: string;
    iconBg: string;
    iconText?: string;
    name: string;
    subtitle: string;
    capabilities: string[];
    connected: boolean;
    detail?: string;
    onConnect: () => void;
    onDisconnect?: () => void;
    setupGuide?: React.ReactNode;
}) {
    const [showGuide, setShowGuide] = useState(false);
    return (
        <div
            className={`card p-5 ${connected ? "border-success/20 bg-success/5" : ""}`}
        >
            <div className="flex items-start gap-4">
                <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-base"
                    style={{ backgroundColor: iconBg }}
                >
                    {icon ?? iconText}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink">
                            {name}
                        </span>
                        <span className="text-xs text-ink-muted">
                            {subtitle}
                        </span>
                        <span
                            className={`inline-flex items-center gap-1 text-[0.65rem] font-mono px-1.5 py-0.5 rounded border ${connected ? "bg-success/10 border-success/30 text-success" : "bg-surface-3 border-border text-ink-muted"}`}
                        >
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-success" : "bg-ink-muted"}`}
                            />
                            {connected ? "Connected" : "Not connected"}
                        </span>
                    </div>
                    {detail && (
                        <p className="text-xs text-ink-dim mt-0.5">{detail}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {capabilities.map((c) => (
                            <span
                                key={c}
                                className="text-[0.65rem] bg-surface-3 border border-border text-ink-muted px-1.5 py-0.5 rounded"
                            >
                                {c}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {setupGuide && !connected && (
                        <button
                            onClick={() => setShowGuide(!showGuide)}
                            className="text-xs text-accent hover:underline"
                        >
                            {showGuide ? "Hide" : "Setup guide"}
                        </button>
                    )}
                    {connected ? (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onDisconnect}
                        >
                            Disconnect
                        </Button>
                    ) : (
                        <Button size="sm" onClick={onConnect}>
                            Connect
                        </Button>
                    )}
                </div>
            </div>
            {showGuide && setupGuide && !connected && (
                <div className="mt-4 pt-4 border-t border-border">
                    {setupGuide}
                </div>
            )}
        </div>
    );
}

function TavilyCard({ configured }: { configured: boolean }) {
    return (
        <div
            className={`card p-5 ${configured ? "border-success/20 bg-success/5" : "border-amber-500/20 bg-amber-500/5"}`}
        >
            <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-base bg-[#0066FF]">
                    🔍
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink">
                            Tavily Web Search
                        </span>
                        <span className="text-xs text-ink-muted">
                            Real-time web + news
                        </span>
                        <span
                            className={`inline-flex items-center gap-1 text-[0.65rem] font-mono px-1.5 py-0.5 rounded border ${configured ? "bg-success/10 border-success/30 text-success" : "bg-amber-500/10 border-amber-500/30 text-amber-600"}`}
                        >
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${configured ? "bg-success" : "bg-amber-500"}`}
                            />
                            {configured ? "Active" : "Needs API key"}
                        </span>
                    </div>
                    <p className="text-xs text-ink-dim mt-0.5">
                        {configured
                            ? "Web search active — ask anything current"
                            : "Add TAVILY_API_KEY to .env.local (free at app.tavily.com)"}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {[
                            "Search the web",
                            "Latest news",
                            "Research any topic",
                            "No OAuth needed",
                        ].map((c) => (
                            <span
                                key={c}
                                className="text-[0.65rem] bg-surface-3 border border-border text-ink-muted px-1.5 py-0.5 rounded"
                            >
                                {c}
                            </span>
                        ))}
                    </div>
                </div>
                {!configured && (
                    <a
                        href="https://app.tavily.com"
                        target="_blank"
                        className="text-xs text-accent hover:underline shrink-0 mt-1"
                    >
                        Get free key →
                    </a>
                )}
            </div>
            {!configured && (
                <div className="mt-4 pt-4 border-t border-border">
                    <ol className="space-y-1 text-xs text-ink-dim list-decimal list-inside">
                        <li>
                            Go to{" "}
                            <a
                                href="https://app.tavily.com"
                                target="_blank"
                                className="text-accent underline"
                            >
                                app.tavily.com
                            </a>{" "}
                            → sign up (free) → copy your API key
                        </li>
                        <li>
                            Add to .env.local:{" "}
                            <code className="font-mono bg-surface-1 px-1 rounded">
                                TAVILY_API_KEY=tvly-...
                            </code>
                        </li>
                        <li>
                            Restart Docker — web search will work immediately,
                            no dashboard connection needed
                        </li>
                    </ol>
                </div>
            )}
        </div>
    );
}

function Toast({
    type,
    children,
}: {
    type: "success" | "error" | "info";
    children: React.ReactNode;
}) {
    const s = {
        success: "bg-success/10 border-success/30 text-success",
        error: "bg-danger/10 border-danger/30 text-danger",
        info: "bg-surface-2 border-border text-ink-muted",
    }[type];
    return (
        <div className={`px-4 py-3 rounded-lg border text-sm mb-4 ${s}`}>
            {children}
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
    const [showNotionModal, setShowNotionModal] = useState(false);
    const [notionToast, setNotionToast] = useState<{
        type: "success" | "error";
        msg: string;
    } | null>(null);
    const [showTodoistModal, setShowTodoistModal] = useState(false);
    const [todoistToast, setTodoistToast] = useState<{
        type: "success" | "error";
        msg: string;
    } | null>(null);

    const sp = (k: string) => searchParams?.get(k);
    const refreshKey = `${sp("slack_success")}${sp("zoom_success")}${sp("github_success")}${notionToast?.msg}${todoistToast?.msg}`;

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") {
            router.push("/login");
            return;
        }
        setLoading(true);
        fetch("/api/dashboard")
            .then((r) => r.json())
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [status, router, refreshKey]);

    const newChat = async () => {
        setNewChatLoading(true);
        try {
            const r = await fetch("/api/threads", { method: "POST" });
            const t = await r.json();
            router.push(`/chat/${t.id}`);
        } catch {
            alert("Could not create chat.");
        } finally {
            setNewChatLoading(false);
        }
    };

    const disconnectNotion = async () => {
        if (!confirm("Disconnect Notion?")) return;
        await fetch("/api/notion-connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "disconnect" }),
        });
        setNotionToast({
            type: "info" as "success",
            msg: "Notion disconnected.",
        });
        const r = await fetch("/api/dashboard");
        setStats(await r.json());
    };

    const disconnectTodoist = async () => {
        if (!confirm("Disconnect Todoist?")) return;
        await fetch("/api/todoist-connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "disconnect" }),
        });
        setTodoistToast({
            type: "success" as "error",
            msg: "Todoist disconnected.",
        });
        const r = await fetch("/api/dashboard");
        setStats(await r.json());
    };

    const handleTodoistConnected = async (name: string) => {
        setShowTodoistModal(false);
        setTodoistToast({
            type: "success",
            msg: `✓ Todoist connected as "${name}"! Try: "show my tasks for today"`,
        });
        const r = await fetch("/api/dashboard");
        setStats(await r.json());
    };

    const handleNotionConnected = async (ws: string) => {
        setShowNotionModal(false);
        setNotionToast({
            type: "success",
            msg: `✓ Notion connected to "${ws}"! Share pages with your integration in Notion → ··· → Add connections.`,
        });
        const r = await fetch("/api/dashboard");
        setStats(await r.json());
    };

    if (status === "loading")
        return (
            <div className="flex items-center justify-center h-full">
                <Spinner className="w-6 h-6" />
            </div>
        );

    const connected = (p: string) =>
        stats?.integrations.some((i) => i.provider === p) ?? false;
    const teamName = (p: string) =>
        stats?.integrations.find((i) => i.provider === p)?.teamName;
    const totalConnected = [
        "google",
        "slack",
        "zoom",
        "notion",
        "github",
        "todoist",
    ].filter(connected).length;
    // Tavily doesn't require OAuth — check env (approximation: always show as needing setup unless we can verify)
    // We show it as a separate "no login needed" card

    return (
        <div className="h-full flex flex-col">
            <DashboardHeader />
            {showNotionModal && (
                <NotionTokenModal
                    onClose={() => setShowNotionModal(false)}
                    onConnected={handleNotionConnected}
                />
            )}
            {showTodoistModal && (
                <TodoistTokenModal
                    onClose={() => setShowTodoistModal(false)}
                    onConnected={handleTodoistConnected}
                />
            )}

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-8 py-8">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h1 className="font-display text-2xl font-bold text-ink">
                                Dashboard
                            </h1>
                            <p className="text-sm text-ink-muted mt-1">
                                Welcome back,{" "}
                                {session?.user?.name?.split(" ")[0] ?? "there"}
                            </p>
                        </div>
                        <Button
                            onClick={newChat}
                            size="sm"
                            loading={newChatLoading}
                        >
                            + New Chat
                        </Button>
                    </div>

                    {/* Toasts */}
                    {notionToast && (
                        <Toast type={notionToast.type}>{notionToast.msg}</Toast>
                    )}
                    {todoistToast && (
                        <Toast type={todoistToast.type}>
                            {todoistToast.msg}
                        </Toast>
                    )}
                    {sp("slack_success") === "1" && (
                        <Toast type="success">
                            ✓ Slack connected to{" "}
                            <strong>{sp("team") ?? "workspace"}</strong>!
                        </Toast>
                    )}
                    {sp("slack_success") === "disconnected" && (
                        <Toast type="info">Slack disconnected.</Toast>
                    )}
                    {sp("slack_error") && (
                        <Toast type="error">
                            <strong>Slack: </strong>
                            {ERRORS.slack[sp("slack_error")!] ??
                                sp("slack_error")}
                        </Toast>
                    )}
                    {sp("zoom_success") === "1" && (
                        <Toast type="success">
                            ✓ Zoom connected
                            {sp("name") ? ` as ${sp("name")}` : ""}!
                        </Toast>
                    )}
                    {sp("zoom_success") === "disconnected" && (
                        <Toast type="info">Zoom disconnected.</Toast>
                    )}
                    {sp("zoom_error") && (
                        <Toast type="error">
                            <strong>Zoom: </strong>
                            {ERRORS.zoom[sp("zoom_error")!] ?? sp("zoom_error")}
                        </Toast>
                    )}
                    {sp("github_success") === "1" && (
                        <Toast type="success">
                            ✓ GitHub connected as{" "}
                            <strong>@{sp("username")}</strong>! Try: "what PRs
                            need my review?"
                        </Toast>
                    )}
                    {sp("github_success") === "disconnected" && (
                        <Toast type="info">GitHub disconnected.</Toast>
                    )}
                    {sp("github_error") && (
                        <Toast type="error">
                            <strong>GitHub: </strong>
                            {ERRORS.github[sp("github_error")!] ??
                                sp("github_error")}
                        </Toast>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Spinner className="w-6 h-6" />
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Stats */}
                            <section>
                                <h2 className="text-xs font-mono text-ink-muted uppercase tracking-widest mb-4">
                                    Overview
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <StatsCard
                                        icon="◎"
                                        label="Conversations"
                                        value={stats?.totalThreads ?? 0}
                                        sub="All time"
                                        accent
                                    />
                                    <StatsCard
                                        icon="◉"
                                        label="Messages"
                                        value={stats?.totalMessages ?? 0}
                                        sub="Sent and received"
                                    />
                                    <StatsCard
                                        icon="⚡"
                                        label="Integrations"
                                        value={`${totalConnected} / 6`}
                                        sub="Connected"
                                    />
                                    <StatsCard
                                        icon="●"
                                        label="Status"
                                        value={
                                            totalConnected === 6
                                                ? "Full"
                                                : totalConnected > 0
                                                  ? "Partial"
                                                  : "None"
                                        }
                                        sub={
                                            totalConnected === 6
                                                ? "All active"
                                                : "Connect more below"
                                        }
                                    />
                                </div>
                            </section>

                            {/* Integrations */}
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xs font-mono text-ink-muted uppercase tracking-widest">
                                        Integrations
                                    </h2>
                                    <span className="text-xs text-ink-muted">
                                        {totalConnected} of 6 connected
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    <IntCard
                                        iconText="G"
                                        iconBg="#4285F4"
                                        name="Google"
                                        subtitle="Gmail + Calendar"
                                        capabilities={[
                                            "Read emails",
                                            "View calendar",
                                            "Create events",
                                            "Check conflicts",
                                        ]}
                                        connected={connected("google")}
                                        detail={
                                            connected("google")
                                                ? `Signed in as ${session?.user?.email}`
                                                : "Click to grant Gmail and Calendar access"
                                        }
                                        onConnect={() =>
                                            signIn("google", {
                                                callbackUrl: "/dashboard",
                                            })
                                        }
                                    />

                                    <IntCard
                                        iconText="S"
                                        iconBg="#4A154B"
                                        name="Slack"
                                        subtitle="Team messaging"
                                        capabilities={[
                                            "List channels",
                                            "Send messages",
                                            "Announce meetings",
                                        ]}
                                        connected={connected("slack")}
                                        detail={
                                            connected("slack")
                                                ? `Workspace: ${teamName("slack") ?? "Connected"}`
                                                : "Requires a bot token — see setup guide"
                                        }
                                        onConnect={() => {
                                            window.location.href =
                                                "/api/slack-connect?action=connect";
                                        }}
                                        onDisconnect={() => {
                                            if (confirm("Disconnect Slack?"))
                                                window.location.href =
                                                    "/api/slack-connect?action=disconnect";
                                        }}
                                        setupGuide={
                                            <ol className="space-y-1.5 text-xs text-ink-dim list-decimal list-inside">
                                                <li>
                                                    Go to{" "}
                                                    <a
                                                        href="https://api.slack.com/apps"
                                                        target="_blank"
                                                        className="text-accent underline"
                                                    >
                                                        api.slack.com/apps
                                                    </a>{" "}
                                                    → Create New App → From
                                                    scratch
                                                </li>
                                                <li>
                                                    OAuth &amp; Permissions →
                                                    Bot Token Scopes:{" "}
                                                    <code className="font-mono bg-surface-3 px-1 rounded">
                                                        chat:write
                                                    </code>{" "}
                                                    <code className="font-mono bg-surface-3 px-1 rounded">
                                                        channels:read
                                                    </code>{" "}
                                                    <code className="font-mono bg-surface-3 px-1 rounded">
                                                        groups:read
                                                    </code>
                                                </li>
                                                <li>
                                                    Install to Workspace → copy{" "}
                                                    <strong>
                                                        Bot User OAuth Token
                                                    </strong>{" "}
                                                    (xoxb-...)
                                                </li>
                                                <li>
                                                    Add{" "}
                                                    <code className="font-mono bg-surface-3 px-1 rounded">
                                                        SLACK_BOT_TOKEN=xoxb-...
                                                    </code>{" "}
                                                    to .env.local → restart
                                                    Docker
                                                </li>
                                                <li>
                                                    Click Connect Slack, then{" "}
                                                    <code className="font-mono bg-surface-3 px-1 rounded">
                                                        /invite @YourBot
                                                    </code>{" "}
                                                    in Slack channels
                                                </li>
                                            </ol>
                                        }
                                    />

                                    <IntCard
                                        iconText="Z"
                                        iconBg="#2D8CFF"
                                        name="Zoom"
                                        subtitle="Video meetings"
                                        capabilities={[
                                            "List meetings",
                                            "Create meetings",
                                            "Get join links",
                                            "Delete meetings",
                                        ]}
                                        connected={connected("zoom")}
                                        detail={
                                            connected("zoom")
                                                ? `Account: ${teamName("zoom") ?? "Connected"}`
                                                : "OAuth — click Connect to authorize"
                                        }
                                        onConnect={() => {
                                            window.location.href =
                                                "/api/zoom-connect?action=connect";
                                        }}
                                        onDisconnect={() => {
                                            if (confirm("Disconnect Zoom?"))
                                                window.location.href =
                                                    "/api/zoom-connect?action=disconnect";
                                        }}
                                        setupGuide={
                                            <ol className="space-y-1.5 text-xs text-ink-dim list-decimal list-inside">
                                                <li>
                                                    Go to{" "}
                                                    <a
                                                        href="https://marketplace.zoom.us/develop/create"
                                                        target="_blank"
                                                        className="text-accent underline"
                                                    >
                                                        marketplace.zoom.us
                                                    </a>{" "}
                                                    → Build App →{" "}
                                                    <strong>OAuth</strong>
                                                </li>
                                                <li>
                                                    Redirect URL:{" "}
                                                    <code className="font-mono bg-surface-3 px-1 rounded">
                                                        http://localhost:3000/api/zoom-callback
                                                    </code>
                                                </li>
                                                <li>
                                                    Scopes:{" "}
                                                    <code className="font-mono bg-surface-3 px-1 rounded">
                                                        meeting:read
                                                    </code>{" "}
                                                    <code className="font-mono bg-surface-3 px-1 rounded">
                                                        meeting:write
                                                    </code>{" "}
                                                    <code className="font-mono bg-surface-3 px-1 rounded">
                                                        user:read
                                                    </code>
                                                </li>
                                                <li>
                                                    Copy Client ID + Secret →
                                                    add to .env.local → restart
                                                    Docker → click Connect
                                                </li>
                                            </ol>
                                        }
                                    />

                                    <IntCard
                                        iconText="N"
                                        iconBg="#191919"
                                        name="Notion"
                                        subtitle="Docs & databases"
                                        capabilities={[
                                            "Search pages",
                                            "Read content",
                                            "Create pages",
                                            "Append notes",
                                            "List databases",
                                        ]}
                                        connected={connected("notion")}
                                        detail={
                                            connected("notion")
                                                ? `Workspace: ${teamName("notion") ?? "Connected"} — share pages with your integration`
                                                : "Paste Internal Integration Secret — no OAuth needed"
                                        }
                                        onConnect={() =>
                                            setShowNotionModal(true)
                                        }
                                        onDisconnect={disconnectNotion}
                                    />

                                    <IntCard
                                        iconText="GH"
                                        iconBg="#24292e"
                                        name="GitHub"
                                        subtitle="Code & repos"
                                        capabilities={[
                                            "List repos",
                                            "View PRs needing review",
                                            "Browse issues",
                                            "Create issues",
                                        ]}
                                        connected={connected("github")}
                                        detail={
                                            connected("github")
                                                ? `Connected as @${teamName("github") ?? "github user"}`
                                                : "OAuth — click Connect to authorize"
                                        }
                                        onConnect={() => {
                                            window.location.href =
                                                "/api/github-connect?action=connect";
                                        }}
                                        onDisconnect={() => {
                                            if (confirm("Disconnect GitHub?"))
                                                window.location.href =
                                                    "/api/github-connect?action=disconnect";
                                        }}
                                        setupGuide={
                                            <ol className="space-y-1.5 text-xs text-ink-dim list-decimal list-inside">
                                                <li>
                                                    Go to{" "}
                                                    <a
                                                        href="https://github.com/settings/developers"
                                                        target="_blank"
                                                        className="text-accent underline"
                                                    >
                                                        github.com/settings/developers
                                                    </a>{" "}
                                                    → OAuth Apps →{" "}
                                                    <strong>
                                                        New OAuth App
                                                    </strong>
                                                </li>
                                                <li>
                                                    Homepage URL:{" "}
                                                    <code className="font-mono bg-surface-3 px-1 rounded">
                                                        http://localhost:3000
                                                    </code>
                                                </li>
                                                <li>
                                                    Callback URL:{" "}
                                                    <code className="font-mono bg-surface-3 px-1 rounded">
                                                        http://localhost:3000/api/github-callback
                                                    </code>
                                                </li>
                                                <li>
                                                    Register App → copy Client
                                                    ID + generate Client Secret
                                                </li>
                                                <li>
                                                    Add to .env.local:
                                                    <div className="mt-1 font-mono bg-surface-1 rounded p-2 text-[0.68rem]">
                                                        GITHUB_CLIENT_ID=your_id
                                                        <br />
                                                        GITHUB_CLIENT_SECRET=your_secret
                                                    </div>
                                                </li>
                                                <li>
                                                    Restart Docker → click{" "}
                                                    <strong>
                                                        Connect GitHub
                                                    </strong>
                                                </li>
                                            </ol>
                                        }
                                    />

                                    <IntCard
                                        iconText="✓"
                                        iconBg="#DB4035"
                                        name="Todoist"
                                        subtitle="Tasks & projects"
                                        capabilities={[
                                            "Today's tasks",
                                            "Overdue tasks",
                                            "Create tasks",
                                            "Complete tasks",
                                            "Update due dates",
                                        ]}
                                        connected={connected("todoist")}
                                        detail={
                                            connected("todoist")
                                                ? `Connected as ${teamName("todoist") ?? "Todoist user"}`
                                                : "Paste your API token — no OAuth, no env vars needed"
                                        }
                                        onConnect={() =>
                                            setShowTodoistModal(true)
                                        }
                                        onDisconnect={disconnectTodoist}
                                    />

                                    {/* Tavily — no OAuth, just an env var */}
                                    <TavilyCard configured={false} />
                                </div>
                            </section>

                            {/* Example prompts */}
                            <section className="card p-5">
                                <h3 className="text-sm font-semibold text-ink mb-3">
                                    What you can ask SmartDesk
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                    {(
                                        [
                                            [
                                                "G",
                                                "#4285F4",
                                                "Show my unread emails from today",
                                            ],
                                            [
                                                "G",
                                                "#4285F4",
                                                "Schedule a team sync tomorrow at 3pm",
                                            ],
                                            [
                                                "S",
                                                "#4A154B",
                                                "Send 'standup done' to #general",
                                            ],
                                            [
                                                "Z",
                                                "#2D8CFF",
                                                "Create a Zoom call for Friday 2pm",
                                            ],
                                            [
                                                "GH",
                                                "#24292e",
                                                "What PRs are waiting for my review?",
                                            ],
                                            [
                                                "GH",
                                                "#24292e",
                                                "List open issues assigned to me",
                                            ],
                                            [
                                                "GH",
                                                "#24292e",
                                                "Create a GitHub issue: fix login bug in my-app",
                                            ],
                                            [
                                                "✓",
                                                "#DB4035",
                                                "Show my tasks for today",
                                            ],
                                            [
                                                "✓",
                                                "#DB4035",
                                                "Add task: follow up with client — due tomorrow",
                                            ],
                                            [
                                                "✓",
                                                "#DB4035",
                                                "Mark the client proposal task as done",
                                            ],
                                            [
                                                "🔍",
                                                "#0066FF",
                                                "What's the latest news in AI?",
                                            ],
                                            [
                                                "🔍",
                                                "#0066FF",
                                                "Search for Next.js 15 migration guide",
                                            ],
                                        ] as [string, string, string][]
                                    ).map(([icon, color, text]) => (
                                        <button
                                            key={text}
                                            onClick={newChat}
                                            className="flex items-center gap-2.5 text-left px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors group"
                                        >
                                            <span
                                                className="w-5 h-5 rounded text-white text-[0.6rem] font-bold flex items-center justify-center shrink-0"
                                                style={{
                                                    backgroundColor: color,
                                                }}
                                            >
                                                {icon}
                                            </span>
                                            <span className="text-xs text-ink-dim group-hover:text-ink transition-colors">
                                                {text}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Recent threads */}
                            {stats && stats.recentThreads.length > 0 ? (
                                <section>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xs font-mono text-ink-muted uppercase tracking-widest">
                                            Recent Conversations
                                        </h2>
                                        <Link
                                            href="/chat"
                                            className="text-xs text-accent hover:underline"
                                        >
                                            View all
                                        </Link>
                                    </div>
                                    <div className="space-y-2">
                                        {stats.recentThreads.map((t) => (
                                            <Link
                                                key={t.id}
                                                href={`/chat/${t.id}`}
                                                className="card-hover flex items-center gap-4 px-4 py-3"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-surface-3 border border-border flex items-center justify-center text-sm text-ink-muted shrink-0">
                                                    ◎
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-ink truncate">
                                                        {t.title}
                                                    </p>
                                                    {t.lastMessage && (
                                                        <p className="text-xs text-ink-muted truncate">
                                                            {t.lastMessage}
                                                        </p>
                                                    )}
                                                </div>
                                                <p className="text-xs text-ink-muted font-mono shrink-0">
                                                    {new Date(
                                                        t.updatedAt,
                                                    ).toLocaleDateString()}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            ) : (
                                <section className="text-center py-12">
                                    <p className="text-ink-muted text-sm mb-4">
                                        No conversations yet.
                                    </p>
                                    <Button
                                        onClick={newChat}
                                        loading={newChatLoading}
                                    >
                                        Start your first chat
                                    </Button>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
