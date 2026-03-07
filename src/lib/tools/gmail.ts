import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { google } from "googleapis";
import type { RunnableConfig } from "@langchain/core/runnables";

const getClient = (token: string) => {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    return google.gmail({ version: "v1", auth });
};

export const listEmailsTool = tool(
    async (
        { maxResults, query }: { maxResults?: number; query?: string },
        config?: RunnableConfig,
    ) => {
        const token = config?.configurable?.googleAccessToken as string;
        const gmail = getClient(token);
        const list = await gmail.users.messages.list({
            userId: "me",
            maxResults: maxResults ?? 5,
            q: query ?? "is:unread",
        });
        const messages = list.data.messages ?? [];
        if (!messages.length) return JSON.stringify({ emails: [] });

        const emails = await Promise.all(
            messages.slice(0, maxResults ?? 5).map(async (msg) => {
                const d = await gmail.users.messages.get({
                    userId: "me",
                    id: msg.id!,
                    format: "metadata",
                    metadataHeaders: ["Subject", "From", "Date"],
                });
                const h = d.data.payload?.headers ?? [];
                const g = (n: string) =>
                    h.find((x) => x.name === n)?.value ?? "";
                return {
                    id: msg.id,
                    subject: g("Subject"),
                    from: g("From"),
                    date: g("Date"),
                    snippet: d.data.snippet ?? "",
                };
            }),
        );
        return JSON.stringify({ emails, total: list.data.resultSizeEstimate });
    },
    {
        name: "list_emails",
        description:
            "Fetch recent Gmail emails. Use when user wants to see or summarise emails.",
        schema: z.object({
            maxResults: z
                .number()
                .min(1)
                .max(20)
                .default(5)
                .describe("Number of emails"),
            query: z
                .string()
                .optional()
                .describe('Gmail search e.g. "from:boss@co.com"'),
        }),
    },
);

export const getEmailBodyTool = tool(
    async ({ emailId }: { emailId: string }, config?: RunnableConfig) => {
        const token = config?.configurable?.googleAccessToken as string;
        const gmail = getClient(token);
        const d = await gmail.users.messages.get({
            userId: "me",
            id: emailId,
            format: "full",
        });
        const h = d.data.payload?.headers ?? [];
        const g = (n: string) => h.find((x) => x.name === n)?.value ?? "";
        let body = "";
        const parts = d.data.payload?.parts ?? [];
        const tp = parts.find((p) => p.mimeType === "text/plain");
        if (tp?.body?.data)
            body = Buffer.from(tp.body.data, "base64").toString("utf-8");
        else if (d.data.payload?.body?.data)
            body = Buffer.from(d.data.payload.body.data, "base64").toString(
                "utf-8",
            );
        return JSON.stringify({
            id: emailId,
            subject: g("Subject"),
            from: g("From"),
            date: g("Date"),
            body: body.slice(0, 3000),
        });
    },
    {
        name: "get_email_body",
        description: "Get full content of a specific email by ID.",
        schema: z.object({
            emailId: z.string().describe("Gmail message ID from list_emails"),
        }),
    },
);
