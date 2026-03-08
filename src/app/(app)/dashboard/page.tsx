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

const SLACK_ERRORS: Record<string, string> = {
  missing_token: "SLACK_BOT_TOKEN is not set in .env.local. Add it and restart the server.",
  invalid_token_format: "Token must start with xoxb-. Check your SLACK_BOT_TOKEN.",
  invalid_auth: "Invalid token. Copy the correct Bot Token from api.slack.com.",
  token_revoked: "Token was revoked. Re-install your Slack app and get a new token.",
  not_authed: "Token is missing or blank. Check SLACK_BOT_TOKEN in .env.local.",
  missing_scope: "Bot is missing permissions. Add chat:write, channels:read, groups:read scopes.",
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [newChatLoading, setNewChatLoading] = useState(false);

  const slackSuccess = searchParams?.get("slack_success");
  const slackError = searchParams?.get("slack_error");
  const slackTeamName = searchParams?.get("team");

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") { router.push("/login"); return; }
    fetch("/api/dashboard")
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => setStats(d))
      .catch((err) => console.error("[dashboard]", err))
      .finally(() => setLoading(false));
  }, [status, router, slackSuccess]);

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

  const connectGoogle = () => signIn("google", { callbackUrl: "/dashboard" });
  const connectSlack = () => { window.location.href = "/api/slack-connect?action=connect"; };
  const disconnectSlack = () => {
    if (confirm("Disconnect Slack?")) { window.location.href = "/api/slack-connect?action=disconnect"; }
  };

  if (status === "loading") {
    return <div className="flex items-center justify-center h-full"><Spinner className="w-6 h-6" /></div>;
  }

  const googleConnected = stats?.integrations.some((i) => i.provider === "google") ?? false;
  const slackConnected = stats?.integrations.some((i) => i.provider === "slack") ?? false;
  const slackTeam = stats?.integrations.find((i) => i.provider === "slack")?.teamName;
  const slackErrorMessage = slackError ? (SLACK_ERRORS[slackError] ?? `Slack error: ${slackError}`) : null;

  return (
    <div className="h-full flex flex-col">
      <DashboardHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Dashboard</h1>
              <p className="text-sm text-ink-muted mt-1">Welcome back, {session?.user?.name?.split(" ")[0] ?? "there"}</p>
            </div>
            <Button onClick={newChat} size="sm" loading={newChatLoading}>+ New Chat</Button>
          </div>

          {slackSuccess === "1" && (
            <div className="mb-6 px-4 py-3 bg-success/10 border border-success/30 rounded-lg text-sm text-success flex items-center gap-2">
              <span>checkmark</span>
              <span>Slack connected to <strong>{slackTeamName ?? "your workspace"}</strong>! You can now use Slack in chat.</span>
            </div>
          )}
          {slackSuccess === "disconnected" && (
            <div className="mb-6 px-4 py-3 bg-surface-2 border border-border rounded-lg text-sm text-ink-muted">Slack disconnected.</div>
          )}
          {slackErrorMessage && (
            <div className="mb-6 px-4 py-3 bg-danger/10 border border-danger/30 rounded-lg text-sm">
              <p className="text-danger font-semibold mb-1">Could not connect Slack</p>
              <p className="text-danger/80">{slackErrorMessage}</p>
              {(slackError === "missing_token" || slackError === "invalid_token_format") && (
                <div className="mt-2 p-2 bg-surface-1 rounded text-xs font-mono text-ink-muted">SLACK_BOT_TOKEN=xoxb-your-token-here</div>
              )}
              <p className="mt-2 text-xs text-ink-muted">
                Setup: <a href="https://api.slack.com/apps" target="_blank" className="underline text-accent">api.slack.com/apps</a>
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20"><Spinner className="w-6 h-6" /></div>
          ) : (
            <div className="space-y-8">
              <section>
                <h2 className="text-xs font-mono text-ink-muted uppercase tracking-widest mb-4">Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatsCard icon="circledot" label="Conversations" value={stats?.totalThreads ?? 0} sub="All time" accent />
                  <StatsCard icon="bubble" label="Messages" value={stats?.totalMessages ?? 0} sub="Sent and received" />
                  <StatsCard icon="G" label="Google" value={googleConnected ? "connected" : "dash"} sub={googleConnected ? "Connected" : "Not connected"} />
                  <StatsCard icon="S" label="Slack" value={slackConnected ? "connected" : "dash"} sub={slackTeam ?? "Not connected"} />
                </div>
              </section>

              <section>
                <h2 className="text-xs font-mono text-ink-muted uppercase tracking-widest mb-4">Integrations</h2>
                <div className="space-y-3">
                  <IntegrationCard
                    name="Google (Gmail + Calendar)"
                    description="Read emails, manage calendar and create events."
                    icon="G"
                    connected={googleConnected}
                    detail={googleConnected ? `Signed in as ${session?.user?.email}` : "Click to grant Gmail and Calendar access"}
                    onConnect={connectGoogle}
                    connectLabel="Connect Google"
                  />
                  <IntegrationCard
                    name="Slack"
                    description={slackConnected ? `Connected to ${slackTeam ?? "workspace"}` : "Connect your Slack workspace to send messages and announcements."}
                    icon="S"
                    connected={slackConnected}
                    detail={slackConnected ? `Workspace: ${slackTeam ?? "Connected"}` : "Requires SLACK_BOT_TOKEN in .env.local (see guide below)"}
                    onConnect={slackConnected ? disconnectSlack : connectSlack}
                    connectLabel={slackConnected ? "Disconnect" : "Connect Slack"}
                  />
                </div>
              </section>

              {!slackConnected && (
                <section className="card p-5 border-accent/20 bg-accent/5">
                  <h3 className="text-sm font-semibold text-ink mb-3">Slack Setup Guide (2 min)</h3>
                  <ol className="space-y-2 text-sm text-ink-dim list-decimal list-inside">
                    <li>Go to <a href="https://api.slack.com/apps" target="_blank" className="text-accent underline">api.slack.com/apps</a> - Create New App - From scratch - select your workspace</li>
                    <li>OAuth and Permissions - Bot Token Scopes - Add: <code className="font-mono text-xs bg-surface-3 px-1 rounded">chat:write</code> <code className="font-mono text-xs bg-surface-3 px-1 rounded">channels:read</code> <code className="font-mono text-xs bg-surface-3 px-1 rounded">groups:read</code></li>
                    <li>Click Install to Workspace - Allow - copy the Bot User OAuth Token</li>
                    <li>Add to .env.local: <div className="mt-1 p-2 bg-surface-1 rounded font-mono text-xs text-ink-muted">SLACK_BOT_TOKEN=xoxb-your-token-here</div></li>
                    <li>Restart Docker: <code className="font-mono text-xs bg-surface-3 px-1 rounded">docker compose down and docker compose up</code></li>
                    <li>Click Connect Slack above</li>
                    <li>In Slack, invite bot to channels: <code className="font-mono text-xs bg-surface-3 px-1 rounded">/invite @YourBotName</code></li>
                  </ol>
                  <div className="mt-4 p-3 bg-surface-1 rounded-lg border border-border">
                    <p className="text-xs text-ink-muted">
                      Why not OAuth? Slack OAuth requires an https redirect URI. Localhost is http so Slack blocks it completely.
                      The bot token approach gives identical functionality and is the standard pattern for local dev.
                    </p>
                  </div>
                </section>
              )}

              {(!googleConnected || !slackConnected) && (
                <section className="card p-5 border-warning/20 bg-warning/5">
                  <h3 className="text-sm font-semibold text-ink mb-3">Setup checklist</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={googleConnected ? "text-success" : "text-ink-muted"}>{googleConnected ? "done" : "pending"}</span>
                      <span className={googleConnected ? "text-ink-dim line-through" : "text-ink-dim"}>Connect Google (Gmail + Calendar)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={slackConnected ? "text-success" : "text-ink-muted"}>{slackConnected ? "done" : "pending"}</span>
                      <span className={slackConnected ? "text-ink-dim line-through" : "text-ink-dim"}>Connect Slack workspace</span>
                    </div>
                  </div>
                </section>
              )}

              {stats && stats.recentThreads.length > 0 ? (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-mono text-ink-muted uppercase tracking-widest">Recent Conversations</h2>
                    <Link href="/chat" className="text-xs text-accent hover:underline">View all</Link>
                  </div>
                  <div className="space-y-2">
                    {stats.recentThreads.map((thread) => (
                      <Link key={thread.id} href={`/chat/${thread.id}`} className="card-hover flex items-center gap-4 px-4 py-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-3 border border-border flex items-center justify-center text-sm text-ink-muted shrink-0">dot</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{thread.title}</p>
                          {thread.lastMessage && <p className="text-xs text-ink-muted truncate">{thread.lastMessage}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-ink-muted font-mono">{new Date(thread.updatedAt).toLocaleDateString()}</p>
                          {thread.messageCount !== undefined && <p className="text-[0.65rem] text-muted-dim">{thread.messageCount} msgs</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : (
                <section className="text-center py-12">
                  <p className="text-ink-muted text-sm mb-4">No conversations yet.</p>
                  <Button onClick={newChat} loading={newChatLoading}>Start your first chat</Button>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
