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

const SLACK_ERRORS: Record<string, string> = {
    missing_token:
        "SLACK_BOT_TOKEN is not set in .env.local. Add it and restart Docker.",
    invalid_token_format:
        "Token must start with xoxb-. Check your SLACK_BOT_TOKEN.",
    invalid_auth:
        "Invalid Slack token. Copy the correct Bot Token from api.slack.com.",
    token_revoked:
        "Token was revoked. Re-install your Slack app to get a new token.",
    not_authed:
        "Token is missing or blank. Check SLACK_BOT_TOKEN in .env.local.",
    missing_scope:
        "Bot is missing permissions. Add chat:write, channels:read, groups:read scopes.",
};

const ZOOM_ERRORS: Record<string, string> = {
    missing_config:
        "ZOOM_CLIENT_ID or ZOOM_CLIENT_SECRET is not set in .env.local.",
    invalid_callback: "Invalid OAuth callback. Try connecting again.",
    invalid_state: "OAuth state mismatch. Try connecting again.",
    token_exchange_failed:
        "Could not get Zoom token. Check your app credentials.",
    access_denied:
        "Zoom access denied. Please allow the permissions requested.",
};

const NOTION_ERRORS: Record<string, string> = {
    missing_config:
        "NOTION_CLIENT_ID or NOTION_CLIENT_SECRET is not set in .env.local.",
    invalid_callback: "Invalid OAuth callback. Try connecting again.",
    invalid_state: "OAuth state mismatch. Try connecting again.",
    token_exchange_failed:
        "Could not get Notion token. Check your app credentials.",
    access_denied:
        "Notion access denied. Please allow the permissions requested.",
};

interface IntegrationDef {
    provider: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    capabilities: string[];
    setupSteps?: React.ReactNode;
}

const INTEGRATIONS: IntegrationDef[] = [
    {
        provider: "google",
        name: "Google",
        description: "Gmail + Google Calendar",
        icon: "G",
        color: "#4285F4",
        capabilities: [
            "Read & search emails",
            "View calendar events",
            "Create meetings",
            "Check conflicts",
        ],
    },
    {
        provider: "slack",
        name: "Slack",
        description: "Team messaging",
        icon: "S",
        color: "#4A154B",
        capabilities: ["List channels", "Send messages", "Announce meetings"],
        setupSteps: (
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
                    → Create New App → From scratch
                </li>
                <li>
                    OAuth &amp; Permissions → Bot Token Scopes → Add:{" "}
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
                    <strong>Bot User OAuth Token</strong>
                </li>
                <li>
                    Add to{" "}
                    <code className="font-mono bg-surface-3 px-1 rounded">
                        .env.local
                    </code>
                    :{" "}
                    <code className="font-mono bg-surface-3 px-1 rounded">
                        SLACK_BOT_TOKEN=xoxb-...
                    </code>
                </li>
                <li>
                    Restart Docker:{" "}
                    <code className="font-mono bg-surface-3 px-1 rounded">
                        docker compose down && docker compose up
                    </code>
                </li>
                <li>
                    Click <strong>Connect Slack</strong> below, then{" "}
                    <code className="font-mono bg-surface-3 px-1 rounded">
                        /invite @YourBot
                    </code>{" "}
                    in each channel
                </li>
            </ol>
        ),
    },
    {
        provider: "zoom",
        name: "Zoom",
        description: "Video meetings",
        icon: "Z",
        color: "#2D8CFF",
        capabilities: [
            "List upcoming meetings",
            "Create meetings with link",
            "Get join links",
            "Delete meetings",
        ],
        setupSteps: (
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
                    → Build App → OAuth
                </li>
                <li>
                    Set Redirect URL:{" "}
                    <code className="font-mono bg-surface-3 px-1 rounded">
                        http://localhost:3000/api/zoom-callback
                    </code>
                </li>
                <li>
                    Scopes → Add:{" "}
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
                    Copy Client ID + Secret to{" "}
                    <code className="font-mono bg-surface-3 px-1 rounded">
                        .env.local
                    </code>
                    :
                    <div className="mt-1 font-mono bg-surface-1 rounded p-2 text-[0.68rem] leading-relaxed">
                        ZOOM_CLIENT_ID=your_id
                        <br />
                        ZOOM_CLIENT_SECRET=your_secret
                    </div>
                </li>
                <li>
                    Restart Docker, then click <strong>Connect Zoom</strong>{" "}
                    below
                </li>
            </ol>
        ),
    },
    {
        provider: "notion",
        name: "Notion",
        description: "Docs & databases",
        icon: "N",
        color: "#000000",
        capabilities: [
            "Search pages & docs",
            "Read page content",
            "Create new pages",
            "Append notes",
            "List databases",
        ],
        setupSteps: (
            <ol className="space-y-1.5 text-xs text-ink-dim list-decimal list-inside">
                <li>
                    Go to{" "}
                    <a
                        href="https://www.notion.so/my-integrations"
                        target="_blank"
                        className="text-accent underline"
                    >
                        notion.so/my-integrations
                    </a>{" "}
                    → New integration → <strong>Public</strong> type
                </li>
                <li>
                    Set Redirect URI:{" "}
                    <code className="font-mono bg-surface-3 px-1 rounded">
                        http://localhost:3000/api/notion-callback
                    </code>
                </li>
                <li>
                    Capabilities: check{" "}
                    <strong>Read, Update, Insert content</strong>
                </li>
                <li>
                    Copy OAuth Client ID + Secret to{" "}
                    <code className="font-mono bg-surface-3 px-1 rounded">
                        .env.local
                    </code>
                    :
                    <div className="mt-1 font-mono bg-surface-1 rounded p-2 text-[0.68rem] leading-relaxed">
                        NOTION_CLIENT_ID=your_id
                        <br />
                        NOTION_CLIENT_SECRET=your_secret
                    </div>
                </li>
                <li>
                    Restart Docker, click <strong>Connect Notion</strong> below
                </li>
                <li>
                    In Notion, share each page/database with your integration
                    (Share → Invite → your integration name)
                </li>
            </ol>
        ),
    },
];

// ── Integration card component ────────────────────────────────────────────────
function IntCard({
    def,
    connected,
    detail,
    onConnect,
    onDisconnect,
    showSetup,
    onToggleSetup,
}: {
    def: IntegrationDef;
    connected: boolean;
    detail?: string;
    onConnect: () => void;
    onDisconnect?: () => void;
    showSetup: boolean;
    onToggleSetup: () => void;
}) {
    return (
        <div
            className={`card p-5 ${connected ? "border-success/20 bg-success/5" : ""}`}
        >
            <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                    style={{ backgroundColor: def.color }}
                >
                    {def.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-ink">
                            {def.name}
                        </h3>
                        <span className="text-xs text-ink-muted">
                            {def.description}
                        </span>
                        <span
                            className={`inline-flex items-center gap-1 text-[0.65rem] font-mono px-1.5 py-0.5 rounded border ${
                                connected
                                    ? "bg-success/10 border-success/30 text-success"
                                    : "bg-surface-3 border-border text-ink-muted"
                            }`}
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

                    {/* Capabilities */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {def.capabilities.map((cap) => (
                            <span
                                key={cap}
                                className="text-[0.65rem] bg-surface-3 border border-border text-ink-muted px-1.5 py-0.5 rounded"
                            >
                                {cap}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {def.setupSteps && !connected && (
                        <button
                            onClick={onToggleSetup}
                            className="text-xs text-accent hover:underline"
                        >
                            {showSetup ? "Hide guide" : "Setup guide"}
                        </button>
                    )}
                    {connected ? (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onDisconnect}
                            className="shrink-0"
                        >
                            Disconnect
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={onConnect}
                            className="shrink-0"
                        >
                            Connect
                        </Button>
                    )}
                </div>
            </div>

            {/* Setup guide (expandable) */}
            {showSetup && def.setupSteps && !connected && (
                <div className="mt-4 pt-4 border-t border-border">
                    {def.setupSteps}
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
    const styles = {
        success: "bg-success/10 border-success/30 text-success",
        error: "bg-danger/10 border-danger/30 text-danger",
        info: "bg-surface-2 border-border text-ink-muted",
    };
    return (
        <div
            className={`px-4 py-3 rounded-lg border text-sm mb-4 ${styles[type]}`}
        >
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
    const [openSetup, setOpenSetup] = useState<string | null>(null);

    const slackSuccess = searchParams?.get("slack_success");
    const slackError = searchParams?.get("slack_error");
    const slackTeamName = searchParams?.get("team");
    const zoomSuccess = searchParams?.get("zoom_success");
    const zoomError = searchParams?.get("zoom_error");
    const zoomName = searchParams?.get("name");
    const notionSuccess = searchParams?.get("notion_success");
    const notionError = searchParams?.get("notion_error");
    const notionWorkspace = searchParams?.get("workspace");

    const refreshKey = `${slackSuccess}${zoomSuccess}${notionSuccess}`;

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") {
            router.push("/login");
            return;
        }
        setLoading(true);
        fetch("/api/dashboard")
            .then(async (r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((d) => setStats(d))
            .catch((err) => console.error("[dashboard]", err))
            .finally(() => setLoading(false));
    }, [status, router, refreshKey]);

    const newChat = async () => {
        setNewChatLoading(true);
        try {
            const res = await fetch("/api/threads", { method: "POST" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const thread = await res.json();
            router.push(`/chat/${thread.id}`);
        } catch (err) {
            console.error("[newChat]", err);
            alert("Could not create a new chat. Please try again.");
        } finally {
            setNewChatLoading(false);
        }
    };

    // Connection handlers
    const connectGoogle = () => signIn("google", { callbackUrl: "/dashboard" });
    const connectSlack = () => {
        window.location.href = "/api/slack-connect?action=connect";
    };
    const connectZoom = () => {
        window.location.href = "/api/zoom-connect?action=connect";
    };
    const connectNotion = () => {
        window.location.href = "/api/notion-connect?action=connect";
    };

    const disconnectSlack = () => {
        if (confirm("Disconnect Slack?"))
            window.location.href = "/api/slack-connect?action=disconnect";
    };
    const disconnectZoom = () => {
        if (confirm("Disconnect Zoom? You'll need to re-authorize."))
            window.location.href = "/api/zoom-connect?action=disconnect";
    };
    const disconnectNotion = () => {
        if (confirm("Disconnect Notion?"))
            window.location.href = "/api/notion-connect?action=disconnect";
    };

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center h-full">
                <Spinner className="w-6 h-6" />
            </div>
        );
    }

    const googleConnected =
        stats?.integrations.some((i) => i.provider === "google") ?? false;
    const slackConnected =
        stats?.integrations.some((i) => i.provider === "slack") ?? false;
    const zoomConnected =
        stats?.integrations.some((i) => i.provider === "zoom") ?? false;
    const notionConnected =
        stats?.integrations.some((i) => i.provider === "notion") ?? false;

    const slackTeam = stats?.integrations.find(
        (i) => i.provider === "slack",
    )?.teamName;
    const zoomDisplayName = stats?.integrations.find(
        (i) => i.provider === "zoom",
    )?.teamName;
    const notionWs = stats?.integrations.find(
        (i) => i.provider === "notion",
    )?.teamName;

    const totalConnected = [
        googleConnected,
        slackConnected,
        zoomConnected,
        notionConnected,
    ].filter(Boolean).length;

    const connectHandlers: Record<string, () => void> = {
        google: connectGoogle,
        slack: connectSlack,
        zoom: connectZoom,
        notion: connectNotion,
    };
    const disconnectHandlers: Record<string, (() => void) | undefined> = {
        google: undefined, // Google disconnect = sign out, not supported inline
        slack: disconnectSlack,
        zoom: disconnectZoom,
        notion: disconnectNotion,
    };
    const connectedMap: Record<string, boolean> = {
        google: googleConnected,
        slack: slackConnected,
        zoom: zoomConnected,
        notion: notionConnected,
    };
    const detailMap: Record<string, string | undefined> = {
        google: googleConnected
            ? `Signed in as ${session?.user?.email}`
            : "Gmail + Calendar access",
        slack: slackConnected
            ? `Workspace: ${slackTeam ?? "Connected"}`
            : "Requires bot token (see setup guide)",
        zoom: zoomConnected
            ? `Account: ${zoomDisplayName ?? "Connected"}`
            : "Schedule and join meetings",
        notion: notionConnected
            ? `Workspace: ${notionWs ?? "Connected"}`
            : "Share pages with the integration after connecting",
    };

    return (
        <div className="h-full flex flex-col">
            <DashboardHeader />
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

                    {/* ── OAuth success / error toasts ── */}
                    {slackSuccess === "1" && (
                        <Toast type="success">
                            ✓ Slack connected to{" "}
                            <strong>{slackTeamName ?? "your workspace"}</strong>
                            ! Try asking: "list my slack channels"
                        </Toast>
                    )}
                    {slackSuccess === "disconnected" && (
                        <Toast type="info">Slack disconnected.</Toast>
                    )}
                    {slackError && (
                        <Toast type="error">
                            <p className="font-semibold mb-1">
                                Could not connect Slack
                            </p>
                            <p>
                                {SLACK_ERRORS[slackError] ??
                                    `Slack error: ${slackError}`}
                            </p>
                        </Toast>
                    )}

                    {zoomSuccess === "1" && (
                        <Toast type="success">
                            ✓ Zoom connected{zoomName ? ` as ${zoomName}` : ""}!
                            Try asking: "list my upcoming zoom meetings"
                        </Toast>
                    )}
                    {zoomSuccess === "disconnected" && (
                        <Toast type="info">Zoom disconnected.</Toast>
                    )}
                    {zoomError && (
                        <Toast type="error">
                            <p className="font-semibold mb-1">
                                Could not connect Zoom
                            </p>
                            <p>
                                {ZOOM_ERRORS[zoomError] ??
                                    `Zoom error: ${zoomError}`}
                            </p>
                        </Toast>
                    )}

                    {notionSuccess === "1" && (
                        <Toast type="success">
                            ✓ Notion connected to{" "}
                            <strong>
                                {notionWorkspace ?? "your workspace"}
                            </strong>
                            ! Remember to share pages with your integration in
                            Notion.
                        </Toast>
                    )}
                    {notionSuccess === "disconnected" && (
                        <Toast type="info">Notion disconnected.</Toast>
                    )}
                    {notionError && (
                        <Toast type="error">
                            <p className="font-semibold mb-1">
                                Could not connect Notion
                            </p>
                            <p>
                                {NOTION_ERRORS[notionError] ??
                                    `Notion error: ${notionError}`}
                            </p>
                        </Toast>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Spinner className="w-6 h-6" />
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* ── Stats row ── */}
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
                                        value={`${totalConnected} / 4`}
                                        sub="Connected"
                                    />
                                    <StatsCard
                                        icon="●"
                                        label="Status"
                                        value={
                                            totalConnected === 4
                                                ? "Full"
                                                : totalConnected > 0
                                                  ? "Partial"
                                                  : "None"
                                        }
                                        sub={
                                            totalConnected === 4
                                                ? "All integrations active"
                                                : "Connect more below"
                                        }
                                    />
                                </div>
                            </section>

                            {/* ── Integrations ── */}
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xs font-mono text-ink-muted uppercase tracking-widest">
                                        Integrations
                                    </h2>
                                    <span className="text-xs text-ink-muted">
                                        {totalConnected} of 4 connected
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {INTEGRATIONS.map((def) => (
                                        <IntCard
                                            key={def.provider}
                                            def={def}
                                            connected={
                                                connectedMap[def.provider]
                                            }
                                            detail={detailMap[def.provider]}
                                            onConnect={
                                                connectHandlers[def.provider]
                                            }
                                            onDisconnect={
                                                disconnectHandlers[def.provider]
                                            }
                                            showSetup={
                                                openSetup === def.provider
                                            }
                                            onToggleSetup={() =>
                                                setOpenSetup(
                                                    openSetup === def.provider
                                                        ? null
                                                        : def.provider,
                                                )
                                            }
                                        />
                                    ))}
                                </div>
                            </section>

                            {/* ── What you can do ── */}
                            <section className="card p-5">
                                <h3 className="text-sm font-semibold text-ink mb-3">
                                    What you can ask SmartDesk
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {[
                                        [
                                            "G",
                                            "#4285F4",
                                            "Show my unread emails from today",
                                        ],
                                        [
                                            "G",
                                            "#4285F4",
                                            "What meetings do I have this week?",
                                        ],
                                        [
                                            "G",
                                            "#4285F4",
                                            "Schedule a team sync for tomorrow 3pm",
                                        ],
                                        [
                                            "S",
                                            "#4A154B",
                                            "List my Slack channels",
                                        ],
                                        [
                                            "S",
                                            "#4A154B",
                                            "Send 'standup done' to #general",
                                        ],
                                        [
                                            "Z",
                                            "#2D8CFF",
                                            "Show my upcoming Zoom meetings",
                                        ],
                                        [
                                            "Z",
                                            "#2D8CFF",
                                            "Create a Zoom call with the team for Friday 2pm",
                                        ],
                                        [
                                            "N",
                                            "#000000",
                                            "Find my Q3 planning notes in Notion",
                                        ],
                                        [
                                            "N",
                                            "#000000",
                                            "Create a Notion page with today's meeting notes",
                                        ],
                                        [
                                            "N",
                                            "#000000",
                                            "Append action items to my project doc",
                                        ],
                                    ].map(([icon, color, text]) => (
                                        <button
                                            key={text as string}
                                            onClick={newChat}
                                            className="flex items-center gap-2.5 text-left px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors group"
                                        >
                                            <span
                                                className="w-5 h-5 rounded text-white text-[0.6rem] font-bold flex items-center justify-center shrink-0"
                                                style={{
                                                    backgroundColor:
                                                        color as string,
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

                            {/* ── Recent conversations ── */}
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
                                        {stats.recentThreads.map((thread) => (
                                            <Link
                                                key={thread.id}
                                                href={`/chat/${thread.id}`}
                                                className="card-hover flex items-center gap-4 px-4 py-3"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-surface-3 border border-border flex items-center justify-center text-sm text-ink-muted shrink-0">
                                                    ◎
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-ink truncate">
                                                        {thread.title}
                                                    </p>
                                                    {thread.lastMessage && (
                                                        <p className="text-xs text-ink-muted truncate">
                                                            {thread.lastMessage}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xs text-ink-muted font-mono">
                                                        {new Date(
                                                            thread.updatedAt,
                                                        ).toLocaleDateString()}
                                                    </p>
                                                    {thread.messageCount !==
                                                        undefined && (
                                                        <p className="text-[0.65rem] text-muted-dim">
                                                            {
                                                                thread.messageCount
                                                            }{" "}
                                                            msgs
                                                        </p>
                                                    )}
                                                </div>
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
