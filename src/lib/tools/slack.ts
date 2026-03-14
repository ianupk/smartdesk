import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { WebClient } from "@slack/web-api";
import type { KnownBlock } from "@slack/web-api";
import type { RunnableConfig } from "@langchain/core/runnables";

function getToken(config?: RunnableConfig): string {
    const token = (config?.configurable?.slackAccessToken as string | undefined) ?? process.env.SLACK_BOT_TOKEN;
    if (!token) throw new Error("Slack is not connected. Please go to the Dashboard and click 'Connect Slack'.");
    return token;
}

function slackError(toolName: string, err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    const friendly: Record<string, string> = {
        token_revoked: "Slack token has been revoked. Please reconnect Slack from the Dashboard.",
        invalid_auth: "Invalid Slack token. Please reconnect Slack from the Dashboard.",
        not_authed: "Slack token is missing. Please connect Slack from the Dashboard.",
        channel_not_found: "Channel not found. Make sure the channel name is correct and the bot is in the channel.",
        not_in_channel: "Bot is not in that channel. In Slack, type: /invite @YourBotName",
        is_archived: "That channel is archived and cannot receive messages.",
        missing_scope: "Bot is missing required permissions. Re-install the Slack app with the required scopes.",
    };
    const slackCode = (err as { data?: { error?: string } })?.data?.error;
    if (slackCode && friendly[slackCode]) return JSON.stringify({ error: friendly[slackCode] });
    for (const [key, value] of Object.entries(friendly)) {
        if (msg.includes(key)) return JSON.stringify({ error: value });
    }
    console.error(`[slack:${toolName}]`, err);
    return JSON.stringify({ error: msg });
}

function normaliseChannel(channel: string): string {
    return channel.startsWith("C") ? channel : channel.replace(/^#/, "");
}

// ── list_slack_channels ───────────────────────────────────────────────────────

export const listChannelsTool = tool(
    async (_: object, config?: RunnableConfig) => {
        try {
            const client = new WebClient(getToken(config));
            const res = await client.conversations.list({
                types: "public_channel,private_channel",
                limit: 50,
                exclude_archived: true,
            });
            if (!res.ok) throw new Error(res.error ?? "Failed to list channels");
            const channels = (res.channels ?? []).map((c) => ({
                id: c.id,
                name: c.name,
                members: c.num_members,
                private: c.is_private,
            }));
            return JSON.stringify({ channels, count: channels.length });
        } catch (err) {
            return slackError("list_channels", err);
        }
    },
    {
        name: "list_slack_channels",
        description:
            "List all Slack channels in the workspace. Call when user asks about channels or where to send a message.",
        schema: z.object({
            _unused: z.string().optional().describe("ignored"),
        }),
    },
);

// ── send_slack_message ────────────────────────────────────────────────────────

export const sendMessageTool = tool(
    async ({ channel, text }: { channel: string; text: string }, config?: RunnableConfig) => {
        try {
            const client = new WebClient(getToken(config));
            const channelId = normaliseChannel(channel);
            const res = await client.chat.postMessage({
                channel: channelId,
                text,
                unfurl_links: false,
                unfurl_media: false,
            });
            if (!res.ok) throw new Error(res.error ?? "Failed to send message");
            return JSON.stringify({
                success: true,
                channel: `#${channelId}`,
                timestamp: res.ts,
                message: `Message sent to #${channelId} successfully.`,
            });
        } catch (err) {
            return slackError("send_message", err);
        }
    },
    {
        name: "send_slack_message",
        description: "Send a text message to a Slack channel. Use when user wants to post or send something to Slack.",
        schema: z.object({
            channel: z.string().describe("Channel name (e.g. general) or ID (e.g. C0123456)"),
            text: z.string().describe("The message text to send"),
        }),
    },
);

// ── read_channel_messages ─────────────────────────────────────────────────────

export const readChannelMessagesTool = tool(
    async ({ channel, limit }: { channel: string; limit?: number }, config?: RunnableConfig) => {
        try {
            const client = new WebClient(getToken(config));
            const channelId = normaliseChannel(channel);
            const res = await client.conversations.history({
                channel: channelId,
                limit: limit ?? 20,
            });
            if (!res.ok) throw new Error(res.error ?? "Failed to read messages");

            // Resolve user IDs to names
            const userIds = [...new Set((res.messages ?? []).map((m) => m.user).filter(Boolean) as string[])];
            const userMap: Record<string, string> = {};
            await Promise.all(
                userIds.map(async (uid) => {
                    try {
                        const info = await client.users.info({ user: uid });
                        userMap[uid] = info.user?.real_name ?? info.user?.name ?? uid;
                    } catch {
                        userMap[uid] = uid;
                    }
                }),
            );

            const messages = (res.messages ?? []).reverse().map((m) => ({
                user: userMap[m.user ?? ""] ?? m.user ?? "unknown",
                text: m.text ?? "",
                timestamp: m.ts ? new Date(parseFloat(m.ts) * 1000).toISOString() : "",
                reactions: (m.reactions ?? []).map((r) => `${r.name}(${r.count})`),
            }));

            return JSON.stringify({
                channel: `#${channelId}`,
                messages,
                count: messages.length,
            });
        } catch (err) {
            return slackError("read_channel_messages", err);
        }
    },
    {
        name: "read_channel_messages",
        description:
            "Read recent messages from a Slack channel. Use when user wants to catch up on a channel or see what was discussed.",
        schema: z.object({
            channel: z.string().describe("Channel name or ID"),
            limit: z.number().min(1).max(50).default(20).describe("Number of recent messages to fetch"),
        }),
    },
);

// ── search_slack ──────────────────────────────────────────────────────────────

export const searchSlackTool = tool(
    async ({ query, count }: { query: string; count?: number }, config?: RunnableConfig) => {
        try {
            const client = new WebClient(getToken(config));
            const res = await client.search.messages({
                query,
                count: count ?? 10,
                sort: "timestamp",
                sort_dir: "desc",
            });
            if (!res.ok) throw new Error(res.error ?? "Search failed");

            const matches = (res.messages?.matches ?? []).map((m) => ({
                channel: (m.channel as { name?: string })?.name ?? "unknown",
                user: m.username ?? "unknown",
                text: m.text ?? "",
                timestamp: m.ts ? new Date(parseFloat(m.ts) * 1000).toISOString() : "",
                permalink: m.permalink ?? "",
            }));

            return JSON.stringify({
                query,
                results: matches,
                total: res.messages?.total ?? matches.length,
            });
        } catch (err) {
            return slackError("search_slack", err);
        }
    },
    {
        name: "search_slack",
        description:
            "Search Slack messages across all channels. Use when user wants to find a specific message, topic, or conversation in Slack.",
        schema: z.object({
            query: z.string().describe("Search query text"),
            count: z.number().min(1).max(20).default(10).describe("Number of results"),
        }),
    },
);

// ── schedule_meeting_announcement ─────────────────────────────────────────────

export const announceMeetingTool = tool(
    async (
        {
            channel,
            meetingTitle,
            dateTime,
            organizer,
            meetingLink,
            agenda,
        }: {
            channel: string;
            meetingTitle: string;
            dateTime: string;
            organizer: string;
            meetingLink?: string;
            agenda?: string;
        },
        config?: RunnableConfig,
    ) => {
        try {
            const client = new WebClient(getToken(config));
            const blocks: KnownBlock[] = [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: `📅 ${meetingTitle}`,
                        emoji: true,
                    },
                },
                {
                    type: "section",
                    fields: [
                        { type: "mrkdwn", text: `*When:*\n${dateTime}` },
                        { type: "mrkdwn", text: `*Organizer:*\n${organizer}` },
                    ],
                },
            ];
            if (agenda)
                blocks.push({
                    type: "section",
                    text: { type: "mrkdwn", text: `*Agenda:*\n${agenda}` },
                });
            if (meetingLink)
                blocks.push({
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*Join Meeting:* <${meetingLink}|Click here to join>`,
                    },
                });
            blocks.push({ type: "divider" });

            const channelId = normaliseChannel(channel);
            const res = await client.chat.postMessage({
                channel: channelId,
                text: `📅 Meeting: ${meetingTitle} — ${dateTime}`,
                blocks,
            });
            if (!res.ok) throw new Error(res.error ?? "Failed to post announcement");
            return JSON.stringify({
                success: true,
                channel: `#${channelId}`,
                timestamp: res.ts,
                message: `Meeting announcement posted to #${channelId}.`,
            });
        } catch (err) {
            return slackError("announce_meeting", err);
        }
    },
    {
        name: "schedule_meeting_announcement",
        description:
            "Post a rich formatted meeting announcement to a Slack channel. Use when user wants to announce a meeting.",
        schema: z.object({
            channel: z.string().describe("Channel name or ID"),
            meetingTitle: z.string(),
            dateTime: z.string(),
            organizer: z.string(),
            meetingLink: z.string().optional(),
            agenda: z.string().optional(),
        }),
    },
);
