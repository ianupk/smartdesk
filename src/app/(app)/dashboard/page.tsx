"use client";
import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { IntegrationCard } from "@/components/dashboard/IntegrationCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { DashboardStats } from "@/types";

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [newChatLoading, setNewChatLoading] = useState(false);

    const connected = searchParams?.get("connected");
    const errorParam = searchParams?.get("error");

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") {
            router.push("/login");
            return;
        }

        fetch("/api/dashboard")
            .then(async (r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((d) => setStats(d))
            .catch((err) => console.error("[dashboard]", err))
            .finally(() => setLoading(false));
    }, [status, router]);

    const newChat = async () => {
        setNewChatLoading(true);
        try {
            const res = await fetch("/api/threads", { method: "POST" });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const thread = await res.json();
            router.push(`/chat/${thread.id}`);
        } catch (err) {
            console.error("[newChat]", err);
            alert("Could not create a new chat. Please try again.");
        } finally {
            setNewChatLoading(false);
        }
    };

    // Re-trigger Google OAuth to get Gmail+Calendar scopes
    const connectGoogle = () => {
        signIn("google", { callbackUrl: "/dashboard" });
    };

    // Slack: in dev, just save the SLACK_BOT_TOKEN directly
    const connectSlack = () => {
        window.location.href = "/api/slack-connect";
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
    const slackTeam = stats?.integrations.find(
        (i) => i.provider === "slack",
    )?.teamName;

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

                    {/* Toasts */}
                    {connected === "slack" && (
                        <div className="mb-6 px-4 py-3 bg-success/10 border border-success/30 rounded-lg text-sm text-success">
                            ✓ Slack connected successfully!
                        </div>
                    )}
                    {errorParam && (
                        <div className="mb-6 px-4 py-3 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">
                            ✗{" "}
                            {errorParam === "slack_failed"
                                ? "Failed to connect Slack."
                                : errorParam === "slack_token_invalid"
                                  ? "SLACK_BOT_TOKEN in .env.local is invalid."
                                  : errorParam === "slack_not_configured"
                                    ? "SLACK_CLIENT_ID not set in .env.local."
                                    : errorParam}
                        </div>
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
                                        icon="💬"
                                        label="Messages"
                                        value={stats?.totalMessages ?? 0}
                                        sub="Sent & received"
                                    />
                                    <StatsCard
                                        icon="✉"
                                        label="Google"
                                        value={googleConnected ? "✓" : "—"}
                                        sub={
                                            googleConnected
                                                ? "Connected"
                                                : "Not connected"
                                        }
                                    />
                                    <StatsCard
                                        icon="◉"
                                        label="Slack"
                                        value={slackConnected ? "✓" : "—"}
                                        sub={slackTeam ?? "Not connected"}
                                    />
                                </div>
                            </section>

                            {/* Integrations */}
                            <section>
                                <h2 className="text-xs font-mono text-ink-muted uppercase tracking-widest mb-4">
                                    Integrations
                                </h2>
                                <div className="space-y-3">
                                    <IntegrationCard
                                        name="Google (Gmail + Calendar)"
                                        description="Read emails, manage your calendar and create events. Sign in with Google to grant access."
                                        icon="G"
                                        connected={googleConnected}
                                        detail={
                                            googleConnected
                                                ? `Signed in as ${session?.user?.email}`
                                                : "Click to grant Gmail & Calendar access"
                                        }
                                        onConnect={connectGoogle}
                                        connectLabel="Connect Google"
                                    />

                                    <IntegrationCard
                                        name="Slack"
                                        description={
                                            process.env.NODE_ENV ===
                                            "development"
                                                ? "Add SLACK_BOT_TOKEN to .env.local then click Connect — no OAuth needed for localhost."
                                                : "Connect your Slack workspace to send messages and announcements."
                                        }
                                        icon="◉"
                                        connected={slackConnected}
                                        detail={
                                            slackTeam
                                                ? `Workspace: ${slackTeam}`
                                                : undefined
                                        }
                                        onConnect={connectSlack}
                                        connectLabel="Connect Slack"
                                    />
                                </div>
                            </section>

                            {/* Setup checklist — shown until both are connected */}
                            {(!googleConnected || !slackConnected) && (
                                <section className="card p-5 border-warning/20 bg-warning/5">
                                    <h3 className="text-sm font-semibold text-ink mb-3">
                                        ⚡ Setup checklist
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={
                                                    googleConnected
                                                        ? "text-success"
                                                        : "text-ink-muted"
                                                }
                                            >
                                                {googleConnected ? "✓" : "○"}
                                            </span>
                                            <span
                                                className={
                                                    googleConnected
                                                        ? "text-ink-dim line-through"
                                                        : "text-ink-dim"
                                                }
                                            >
                                                Connect Google (Gmail +
                                                Calendar)
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={
                                                    slackConnected
                                                        ? "text-success"
                                                        : "text-ink-muted"
                                                }
                                            >
                                                {slackConnected ? "✓" : "○"}
                                            </span>
                                            <span
                                                className={
                                                    slackConnected
                                                        ? "text-ink-dim line-through"
                                                        : "text-ink-dim"
                                                }
                                            >
                                                Connect Slack — add{" "}
                                                <code className="font-mono text-xs bg-surface-3 px-1 rounded">
                                                    SLACK_BOT_TOKEN=xoxb-...
                                                </code>{" "}
                                                to .env.local then click Connect
                                                Slack
                                            </span>
                                        </div>
                                    </div>
                                </section>
                            )}

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
                                            View all →
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
                                        Start your first chat →
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
