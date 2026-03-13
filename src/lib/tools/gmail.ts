import { tool } from "@langchain/core/tools";
import { interrupt } from "@langchain/langgraph";
import { z } from "zod";
import { google } from "googleapis";
import type { RunnableConfig } from "@langchain/core/runnables";

const getClient = (token: string) => {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    return google.gmail({ version: "v1", auth });
};

function gmailError(toolName: string, err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    const map: Record<string, string> = {
        "Invalid Credentials":
            "Gmail token expired. Please reconnect Google from Dashboard.",
        insufficientPermissions:
            "Gmail permissions missing. Please reconnect Google with correct scopes.",
        quotaExceeded: "Gmail API quota exceeded. Please wait and try again.",
    };
    for (const [k, v] of Object.entries(map)) {
        if (msg.includes(k)) return JSON.stringify({ error: v });
    }
    console.error(`[gmail:${toolName}]`, msg);
    return JSON.stringify({ error: msg });
}

// ── In-memory read cache (5 min TTL) ─────────────────────────────────────────
// Avoids hitting Gmail API on every message re-fetch during a conversation.
const _cache = new Map<string, { data: unknown; expiry: number }>();
function cacheGet<T>(key: string): T | null {
    const hit = _cache.get(key);
    if (!hit || Date.now() > hit.expiry) {
        _cache.delete(key);
        return null;
    }
    return hit.data as T;
}
function cacheSet(key: string, data: unknown, ttlMs = 300_000) {
    _cache.set(key, { data, expiry: Date.now() + ttlMs });
}

// ── list_emails ───────────────────────────────────────────────────────────────
export const listEmailsTool = tool(
    async (
        { maxResults, query }: { maxResults?: number; query?: string },
        config?: RunnableConfig,
    ) => {
        try {
            const token = config?.configurable?.googleAccessToken as string;
            const limit = Math.min(maxResults ?? 5, 10); // cap at 10
            const cacheKey = `list:${token.slice(-8)}:${query}:${limit}`;
            const cached = cacheGet<object>(cacheKey);
            if (cached) return JSON.stringify(cached);

            const gmail = getClient(token);
            const list = await gmail.users.messages.list({
                userId: "me",
                maxResults: limit,
                q: query ?? "is:unread",
            });
            const messages = list.data.messages ?? [];
            if (!messages.length) return JSON.stringify({ emails: [] });

            // Sequential fetch (not parallel) — avoids rate-limit bursts on free Gmail API
            const emails: object[] = [];
            for (const msg of messages.slice(0, limit)) {
                const d = await gmail.users.messages.get({
                    userId: "me",
                    id: msg.id!,
                    format: "metadata",
                    metadataHeaders: ["Subject", "From", "Date"],
                });
                const h = d.data.payload?.headers ?? [];
                const g = (n: string) =>
                    h.find((x) => x.name === n)?.value ?? "";
                emails.push({
                    id: msg.id,
                    subject: g("Subject"),
                    from: g("From"),
                    date: g("Date"),
                    snippet: (d.data.snippet ?? "").slice(0, 100),
                });
            }

            const result = { emails, total: list.data.resultSizeEstimate };
            cacheSet(cacheKey, result);
            return JSON.stringify(result);
        } catch (err) {
            return gmailError("list_emails", err);
        }
    },
    {
        name: "list_emails",
        description:
            "Fetch recent Gmail emails. Use when user wants to see emails.",
        schema: z.object({
            maxResults: z
                .number()
                .min(1)
                .max(10)
                .default(5)
                .describe("Number of emails (max 10)"),
            query: z
                .string()
                .optional()
                .describe('Gmail search e.g. "from:boss@co.com is:unread"'),
        }),
    },
);

// ── get_email_body ────────────────────────────────────────────────────────────
export const getEmailBodyTool = tool(
    async ({ emailId }: { emailId: string }, config?: RunnableConfig) => {
        try {
            const token = config?.configurable?.googleAccessToken as string;
            const cacheKey = `body:${emailId}`;
            const cached = cacheGet<object>(cacheKey);
            if (cached) return JSON.stringify(cached);

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

            const result = {
                id: emailId,
                subject: g("Subject"),
                from: g("From"),
                date: g("Date"),
                body: body.slice(0, 2000), // trim long emails
            };
            cacheSet(cacheKey, result);
            return JSON.stringify(result);
        } catch (err) {
            return gmailError("get_email_body", err);
        }
    },
    {
        name: "get_email_body",
        description:
            "Get full content of a specific email by ID. Use after list_emails.",
        schema: z.object({
            emailId: z.string().describe("Gmail message ID from list_emails"),
        }),
    },
);

// ── search_emails ─────────────────────────────────────────────────────────────
export const searchEmailsTool = tool(
    async (
        { query, maxResults }: { query: string; maxResults?: number },
        config?: RunnableConfig,
    ) => {
        try {
            const token = config?.configurable?.googleAccessToken as string;
            const limit = Math.min(maxResults ?? 8, 10);
            const gmail = getClient(token);
            const list = await gmail.users.messages.list({
                userId: "me",
                q: query,
                maxResults: limit,
            });
            const messages = list.data.messages ?? [];
            if (!messages.length) return JSON.stringify({ emails: [], query });

            const emails: object[] = [];
            for (const msg of messages.slice(0, limit)) {
                const d = await gmail.users.messages.get({
                    userId: "me",
                    id: msg.id!,
                    format: "metadata",
                    metadataHeaders: ["Subject", "From", "Date"],
                });
                const h = d.data.payload?.headers ?? [];
                const g = (n: string) =>
                    h.find((x) => x.name === n)?.value ?? "";
                emails.push({
                    id: msg.id,
                    subject: g("Subject"),
                    from: g("From"),
                    date: g("Date"),
                    snippet: (d.data.snippet ?? "").slice(0, 100),
                });
            }
            return JSON.stringify({
                emails,
                query,
                total: list.data.resultSizeEstimate,
            });
        } catch (err) {
            return gmailError("search_emails", err);
        }
    },
    {
        name: "search_emails",
        description:
            "Search Gmail. Use when user wants to find emails by sender, subject, or keyword.",
        schema: z.object({
            query: z
                .string()
                .describe('Gmail search e.g. "from:alice subject:report"'),
            maxResults: z.number().min(1).max(10).default(8),
        }),
    },
);

// ── send_email ────────────────────────────────────────────────────────────────
export const sendEmailTool = tool(
    async (
        {
            to,
            subject,
            body,
            cc,
        }: { to: string; subject: string; body: string; cc?: string },
        config?: RunnableConfig,
    ) => {
        const confirmed = interrupt({
            question: "Send this email?",
            details: {
                to,
                cc: cc ?? "",
                subject,
                bodyPreview: body.slice(0, 200),
            },
        });
        if (!confirmed)
            return JSON.stringify({
                cancelled: true,
                message: "Email send cancelled.",
            });

        try {
            const token = config?.configurable?.googleAccessToken as string;
            const gmail = getClient(token);
            const lines = [`To: ${to}`, `Subject: ${subject}`];
            if (cc) lines.push(`Cc: ${cc}`);
            lines.push(
                "Content-Type: text/plain; charset=utf-8",
                "MIME-Version: 1.0",
                "",
                body,
            );
            const raw = Buffer.from(lines.join("\r\n")).toString("base64url");
            const res = await gmail.users.messages.send({
                userId: "me",
                requestBody: { raw },
            });
            return JSON.stringify({
                success: true,
                messageId: res.data.id,
                message: `Email sent to ${to}`,
            });
        } catch (err) {
            return gmailError("send_email", err);
        }
    },
    {
        name: "send_email",
        description: "Send a new Gmail email. Will ask user to confirm first.",
        schema: z.object({
            to: z.string().describe("Recipient email address"),
            subject: z.string().describe("Email subject"),
            body: z.string().describe("Email body (plain text)"),
            cc: z.string().optional().describe("CC email address"),
        }),
    },
);

// ── reply_to_email ────────────────────────────────────────────────────────────
export const replyEmailTool = tool(
    async (
        { emailId, body }: { emailId: string; body: string },
        config?: RunnableConfig,
    ) => {
        const confirmed = interrupt({
            question: "Send this reply?",
            details: { replyingTo: emailId, bodyPreview: body.slice(0, 200) },
        });
        if (!confirmed)
            return JSON.stringify({
                cancelled: true,
                message: "Reply cancelled.",
            });

        try {
            const token = config?.configurable?.googleAccessToken as string;
            const gmail = getClient(token);
            const orig = await gmail.users.messages.get({
                userId: "me",
                id: emailId,
                format: "metadata",
                metadataHeaders: ["Subject", "From", "Message-ID"],
            });
            const h = orig.data.payload?.headers ?? [];
            const g = (n: string) => h.find((x) => x.name === n)?.value ?? "";
            const from = g("From");
            const subject = g("Subject").startsWith("Re:")
                ? g("Subject")
                : `Re: ${g("Subject")}`;
            const msgId = g("Message-ID");
            const threadId = orig.data.threadId ?? undefined;

            const lines = [
                `To: ${from}`,
                `Subject: ${subject}`,
                `In-Reply-To: ${msgId}`,
                `References: ${msgId}`,
                "Content-Type: text/plain; charset=utf-8",
                "MIME-Version: 1.0",
                "",
                body,
            ];
            const raw = Buffer.from(lines.join("\r\n")).toString("base64url");
            const res = await gmail.users.messages.send({
                userId: "me",
                requestBody: { raw, threadId },
            });
            return JSON.stringify({
                success: true,
                messageId: res.data.id,
                message: `Reply sent to ${from}`,
            });
        } catch (err) {
            return gmailError("reply_email", err);
        }
    },
    {
        name: "reply_to_email",
        description:
            "Reply to an existing Gmail thread. Will ask user to confirm.",
        schema: z.object({
            emailId: z.string().describe("Gmail message ID to reply to"),
            body: z.string().describe("Reply body text"),
        }),
    },
);

// ── mark_email_read ───────────────────────────────────────────────────────────
export const markEmailReadTool = tool(
    async ({ emailId }: { emailId: string }, config?: RunnableConfig) => {
        try {
            const token = config?.configurable?.googleAccessToken as string;
            const gmail = getClient(token);
            await gmail.users.messages.modify({
                userId: "me",
                id: emailId,
                requestBody: { removeLabelIds: ["UNREAD"] },
            });
            return JSON.stringify({
                success: true,
                message: `Email ${emailId} marked as read.`,
            });
        } catch (err) {
            return gmailError("mark_email_read", err);
        }
    },
    {
        name: "mark_email_read",
        description: "Mark a Gmail email as read.",
        schema: z.object({ emailId: z.string().describe("Gmail message ID") }),
    },
);
