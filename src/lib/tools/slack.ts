import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { WebClient } from "@slack/web-api";
import type { RunnableConfig } from "@langchain/core/runnables";

const getClient = (config?: RunnableConfig) => {
    const token =
        (config?.configurable?.slackAccessToken as string | undefined) ??
        process.env.SLACK_BOT_TOKEN;

    if (!token) {
        throw new Error(
            "No Slack token available. Please connect Slack from the Dashboard.",
        );
    }
    return new WebClient(token);
};

export const listChannelsTool = tool(
    async (_: object, config?: RunnableConfig) => {
        try {
            const client = getClient(config);
            const res = await client.conversations.list({
                types: "public_channel,private_channel",
                limit: 20,
            });
            if (!res.ok) throw new Error(res.error ?? "Slack API error");
            const channels = (res.channels ?? []).map((c) => ({
                id: c.id,
                name: c.name,
                memberCount: c.num_members,
            }));
            return JSON.stringify({ channels });
        } catch (err) {
            const msg = (err as Error).message;
            console.error("[list_slack_channels]", msg);
            return JSON.stringify({ error: msg });
        }
    },
    {
        name: "list_slack_channels",
        description: "List available Slack channels in the workspace.",
        schema: z.object({}),
    },
);

export const sendMessageTool = tool(
    async (
        { channel, text }: { channel: string; text: string },
        config?: RunnableConfig,
    ) => {
        try {
            const client = getClient(config);
            const res = await client.chat.postMessage({
                channel: channel.startsWith("#") ? channel : `#${channel}`,
                text,
                unfurl_links: false,
            });
            if (!res.ok) throw new Error(res.error ?? "Slack API error");
            return JSON.stringify({
                success: true,
                ts: res.ts,
                channel: res.channel,
            });
        } catch (err) {
            const msg = (err as Error).message;
            console.error("[send_slack_message]", msg);
            return JSON.stringify({ error: msg });
        }
    },
    {
        name: "send_slack_message",
        description: "Send a message to a Slack channel.",
        schema: z.object({
            channel: z.string().describe("Channel name (e.g. general) or ID"),
            text: z.string().describe("Message text to send"),
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
            const client = getClient(config);
            const blocks: object[] = [
                {
                    type: "header",
                    text: { type: "plain_text", text: `📅 ${meetingTitle}` },
                },
                {
                    type: "section",
                    fields: [
                        { type: "mrkdwn", text: `*When:*\n${dateTime}` },
                        { type: "mrkdwn", text: `*Organiser:*\n${organizer}` },
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
                        text: `*Join:* <${meetingLink}|Click here>`,
                    },
                });

            const res = await client.chat.postMessage({
                channel: channel.startsWith("#") ? channel : `#${channel}`,
                text: `📅 ${meetingTitle} — ${dateTime}`,
                blocks,
            });
            if (!res.ok) throw new Error(res.error ?? "Slack API error");
            return JSON.stringify({ success: true, ts: res.ts });
        } catch (err) {
            const msg = (err as Error).message;
            console.error("[schedule_meeting_announcement]", msg);
            return JSON.stringify({ error: msg });
        }
    },
    {
        name: "schedule_meeting_announcement",
        description:
            "Post a formatted meeting announcement to a Slack channel.",
        schema: z.object({
            channel: z.string(),
            meetingTitle: z.string(),
            dateTime: z.string(),
            organizer: z.string(),
            meetingLink: z.string().optional(),
            agenda: z.string().optional(),
        }),
    },
);
