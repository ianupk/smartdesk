/**
 * Slack Tools for LangGraph
 *
 * Token resolution order:
 *   1. config.configurable.slackAccessToken  (from session → DB)
 *   2. process.env.SLACK_BOT_TOKEN           (fallback for dev)
 *
 * The token flows like this:
 *   DB (Integration table)
 *     → session callback (auth.ts reads fresh every request)
 *       → chat API route (puts it in config.configurable)
 *         → LangGraph tool node passes config to each tool
 *           → getToken() extracts it here
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { WebClient, ErrorCode } from "@slack/web-api";
import type { RunnableConfig } from "@langchain/core/runnables";

// ── Token helper ──────────────────────────────────────────────────────────────

function getToken(config?: RunnableConfig): string {
  const token =
    (config?.configurable?.slackAccessToken as string | undefined) ??
    process.env.SLACK_BOT_TOKEN;

  if (!token) {
    throw new Error(
      "Slack is not connected. Please go to the Dashboard and click 'Connect Slack'.",
    );
  }
  return token;
}

function slackError(toolName: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  // Map common Slack error codes to friendly messages
  const friendly: Record<string, string> = {
    "token_revoked": "Slack token has been revoked. Please reconnect Slack from the Dashboard.",
    "invalid_auth": "Invalid Slack token. Please reconnect Slack from the Dashboard.",
    "not_authed": "Slack token is missing. Please connect Slack from the Dashboard.",
    "channel_not_found": "Channel not found. Make sure the channel name is correct and the bot is in the channel.",
    "not_in_channel": "Bot is not in that channel. In Slack, type: /invite @YourBotName",
    "is_archived": "That channel is archived and cannot receive messages.",
    "missing_scope": "Bot is missing required permissions. Re-install the Slack app with chat:write and channels:read scopes.",
  };

  // Check if it's a Slack SDK error with a code
  const slackCode = (err as { code?: string; data?: { error?: string } })?.data?.error;
  if (slackCode && friendly[slackCode]) {
    return JSON.stringify({ error: friendly[slackCode] });
  }

  // Check the message for known error strings
  for (const [key, value] of Object.entries(friendly)) {
    if (msg.includes(key)) return JSON.stringify({ error: value });
  }

  console.error(`[slack:${toolName}]`, err);
  return JSON.stringify({ error: msg });
}

// ── Tools ─────────────────────────────────────────────────────────────────────

export const listChannelsTool = tool(
  async (_: object, config?: RunnableConfig) => {
    try {
      const token = getToken(config);
      const client = new WebClient(token);

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
      "List all available Slack channels in the workspace. Call this when user asks about Slack channels or wants to know where to send a message.",
    schema: z.object({}),
  },
);

export const sendMessageTool = tool(
  async (
    { channel, text }: { channel: string; text: string },
    config?: RunnableConfig,
  ) => {
    try {
      const token = getToken(config);
      const client = new WebClient(token);

      // Normalise channel: strip # and handle IDs (C0123...)
      const channelId = channel.startsWith("C") ? channel : channel.replace(/^#/, "");

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
    description:
      "Send a text message to a Slack channel. Use channel name (e.g. 'general') or channel ID.",
    schema: z.object({
      channel: z.string().describe("Channel name (e.g. general, random) or Slack channel ID (e.g. C0123456)"),
      text: z.string().describe("The message text to send"),
    }),
  },
);

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
      const token = getToken(config);
      const client = new WebClient(token);

      const blocks: object[] = [
        {
          type: "header",
          text: { type: "plain_text", text: `📅 ${meetingTitle}`, emoji: true },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*When:*\n${dateTime}` },
            { type: "mrkdwn", text: `*Organizer:*\n${organizer}` },
          ],
        },
      ];

      if (agenda) {
        blocks.push({
          type: "section",
          text: { type: "mrkdwn", text: `*Agenda:*\n${agenda}` },
        });
      }

      if (meetingLink) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Join Meeting:* <${meetingLink}|Click here to join>`,
          },
        });
      }

      blocks.push({ type: "divider" });

      const channelId = channel.startsWith("C") ? channel : channel.replace(/^#/, "");

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
      meetingTitle: z.string().describe("Title of the meeting"),
      dateTime: z.string().describe("Date and time of the meeting"),
      organizer: z.string().describe("Name of the meeting organizer"),
      meetingLink: z.string().optional().describe("URL to join the meeting"),
      agenda: z.string().optional().describe("Meeting agenda"),
    }),
  },
);
