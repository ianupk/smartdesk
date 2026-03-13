import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { HumanMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { authOptions } from "@/lib/auth";
import { getGraph } from "@/lib/graph";
import { prisma } from "@/lib/prisma";
import { getGoogleToken, getZoomToken } from "@/lib/oauth";

export const maxDuration = 60;

// Next.js 15: params is a Promise — must be awaited before use
type RouteParams = { params: Promise<{ threadId: string }> };

const enc = new TextEncoder();
const sse = (ctrl: ReadableStreamDefaultController, obj: object) =>
    ctrl.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

// ── Groq rate-limit retry helper ─────────────────────────────────────────────
// Groq free tier has two limits:
//   TPM (tokens per minute): resets every 60s — retry after a short wait
//   TPD (tokens per day):    resets at midnight UTC — cannot retry, must inform user
//
// This function parses the "Please try again in Xs" from the Groq error and
// waits that long before retrying (up to MAX_WAIT_MS). If the wait is longer
// than MAX_WAIT_MS (e.g. TPD exhausted = hours), it throws immediately.
const MAX_WAIT_MS = 45_000; // max we're willing to wait (45s, inside our 55s hard timeout)

function parseRetryAfterMs(errorMsg: string): number | null {
    // Groq returns: "Please try again in 19.69s" or "1m5s" or "3m16.992s"
    const match = errorMsg.match(/try again in ([0-9]+m)?([0-9.]+s)?/);
    if (!match) return null;
    const mins = match[1] ? parseFloat(match[1]) : 0;
    const secs = match[2] ? parseFloat(match[2]) : 0;
    return Math.ceil((mins * 60 + secs) * 1000);
}

function isGroqRateLimit(err: unknown): boolean {
    const msg = (err as Error)?.message ?? "";
    return msg.includes("rate_limit_exceeded") || msg.includes("429");
}

async function invokeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 2,
): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            if (!isGroqRateLimit(err)) throw err; // non-rate-limit error — rethrow immediately

            const waitMs = parseRetryAfterMs((err as Error).message ?? "");

            // TPD exhausted (wait > MAX_WAIT_MS or unparseable) — can't recover today
            if (!waitMs || waitMs > MAX_WAIT_MS) {
                throw new Error(
                    "GROQ_TPD_EXHAUSTED: Daily token limit reached. " +
                        "Please wait until midnight UTC or set GROQ_MODEL=llama-3.1-8b-instant in .env.local to switch models.",
                );
            }

            // TPM hit — wait the specified time then retry
            console.log(
                `[chat] Groq TPM rate limit — waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}`,
            );
            await new Promise((r) => setTimeout(r, waitMs + 500)); // +500ms buffer
        }
    }
    throw lastErr;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Next.js 15: await params before accessing properties
    const { threadId } = await params;

    const thread = await prisma.thread.findFirst({
        where: { id: threadId, userId: session.userId },
    });
    if (!thread)
        return NextResponse.json(
            { error: "Thread not found" },
            { status: 404 },
        );

    const body = await req.json();

    // Refresh Google + Zoom tokens proactively before every request
    let googleToken = session.googleAccessToken as string | undefined;
    if (session.userId && googleToken) {
        const fresh = await getGoogleToken(session.userId);
        if (fresh) googleToken = fresh;
    }

    let zoomToken = session.zoomAccessToken as string | undefined;
    if (session.hasZoom && zoomToken) {
        const fresh = await getZoomToken(session.userId);
        if (fresh) zoomToken = fresh;
    }

    const config = {
        configurable: {
            thread_id: threadId,
            userId: session.userId,
            googleAccessToken: googleToken,
            slackAccessToken: session.slackAccessToken as string | undefined,
            zoomAccessToken: zoomToken,
            githubAccessToken: session.githubAccessToken as string | undefined,
            todoistAccessToken: session.todoistAccessToken as
                | string
                | undefined,
        },
        version: "v2" as const,
    };

    // getGraph() returns a cached compiled graph — no recompile on every request
    const graph = await getGraph(config);

    const stream = new ReadableStream({
        async start(controller) {
            // Hard timeout — sends a clean error if everything hangs
            const timeoutId = setTimeout(() => {
                try {
                    sse(controller, {
                        type: "error",
                        message: "Request timed out. Please try again.",
                    });
                    controller.close();
                } catch (_) {}
            }, 55_000);

            try {
                let userMessage = "";
                let input;

                if ("resume" in body) {
                    input = new Command({ resume: body.resume });
                } else {
                    userMessage = body.message as string;
                    input = { messages: [new HumanMessage(userMessage)] };

                    await prisma.message.create({
                        data: {
                            threadId,
                            role: "user",
                            content: userMessage,
                            toolCalls: [],
                        },
                    });
                }

                let assistantText = "";
                const toolsMade: string[] = [];
                let interruptSent = false;
                const isFirstMessage =
                    thread.title === "New conversation" && !!userMessage;

                // Wrap the entire streamEvents loop in retry logic
                await invokeWithRetry(async () => {
                    for await (const event of graph.streamEvents(
                        input,
                        config,
                    )) {
                        if (event.event === "on_tool_start") {
                            if (!toolsMade.includes(event.name)) {
                                toolsMade.push(event.name);
                                sse(controller, {
                                    type: "tool_call",
                                    tool: event.name,
                                });
                            }
                        }

                        if (event.event === "on_chat_model_stream") {
                            const chunk = event.data?.chunk;
                            const text =
                                typeof chunk?.content === "string"
                                    ? chunk.content
                                    : Array.isArray(chunk?.content)
                                      ? chunk.content
                                            .filter(
                                                (c: { type: string }) =>
                                                    c.type === "text",
                                            )
                                            .map(
                                                (c: { text: string }) => c.text,
                                            )
                                            .join("")
                                      : "";
                            if (text) {
                                assistantText += text;
                                sse(controller, {
                                    type: "token",
                                    content: text,
                                });
                            }
                        }

                        if (
                            event.event === "on_chain_stream" &&
                            event.data?.chunk?.__interrupt__
                        ) {
                            const intr =
                                event.data.chunk.__interrupt__[0]?.value;
                            if (intr && !interruptSent) {
                                interruptSent = true;
                                sse(controller, {
                                    type: "interrupt",
                                    content: intr.question,
                                    details: intr.details ?? {},
                                });
                                sse(controller, { type: "done" });
                                clearTimeout(timeoutId);
                                controller.close();
                                return;
                            }
                        }
                    }
                });

                clearTimeout(timeoutId);

                if (assistantText) {
                    await prisma.message.create({
                        data: {
                            threadId,
                            role: "assistant",
                            content: assistantText,
                            toolCalls: toolsMade,
                        },
                    });
                    await prisma.thread.update({
                        where: { id: threadId },
                        data: {
                            title: isFirstMessage
                                ? userMessage.slice(0, 50)
                                : undefined,
                            updatedAt: new Date(),
                        },
                    });
                }

                sse(controller, { type: "done" });
                controller.close();
            } catch (err) {
                clearTimeout(timeoutId);
                const raw = (err as Error).message ?? "An error occurred";
                console.error("[chat route] error:", raw);

                const friendly = raw.includes("GROQ_TPD_EXHAUSTED")
                    ? "⏳ Daily Groq token limit reached. Resets at midnight UTC. To continue now, add a second Groq API key or switch to `llama-3.1-8b-instant` in .env.local (uses separate quota)."
                    : raw.includes("rate_limit_exceeded") || raw.includes("429")
                      ? "Groq rate limit reached. Please wait a moment and try again."
                      : raw.includes("tool call validation failed")
                        ? "A tool call failed — your integration token may have expired. Try reconnecting from Dashboard."
                        : raw.includes("insufficientPermissions")
                          ? "Insufficient permissions. Please reconnect your Google account from Dashboard."
                          : raw.includes("relation") &&
                              raw.includes("does not exist")
                            ? "Database not set up. Run: npx prisma db push"
                            : raw;

                try {
                    sse(controller, { type: "error", message: friendly });
                    controller.close();
                } catch (_) {}
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
