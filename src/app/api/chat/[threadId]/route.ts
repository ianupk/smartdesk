import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { HumanMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { authOptions } from "@/lib/auth";
import { getGraph } from "@/lib/graph";
import { prisma } from "@/lib/prisma";

const enc = new TextEncoder();
const sse = (ctrl: ReadableStreamDefaultController, obj: object) =>
  ctrl.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const thread = await prisma.thread.findFirst({
    where: { id: params.threadId, userId: session.userId },
  });
  if (!thread)
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  const body = await req.json();
  const graph = await getGraph();

  // Token always comes fresh from DB via session callback (see auth.ts)
  const config = {
    configurable: {
      thread_id: params.threadId,
      googleAccessToken: session.googleAccessToken,
      // slackAccessToken is read fresh from DB every request in session callback
      // so this is always current even right after the user connects Slack
      slackAccessToken: session.slackAccessToken,
    },
    version: "v2" as const,
  };

  const stream = new ReadableStream({
    async start(controller) {
      let timeoutId: NodeJS.Timeout | null = null;

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
              threadId: params.threadId,
              role: "user",
              content: userMessage,
              toolCalls: [],
            },
          });
        }

        let assistantText = "";
        const toolsMade: string[] = [];
        let interruptSent = false;
        const isFirstMessage = thread.title === "New conversation" && !!userMessage;

        // 45s timeout — enough for multi-tool chains
        timeoutId = setTimeout(() => {
          console.error("[chat] Timeout");
          try {
            sse(controller, { type: "error", message: "Request timed out. Please try again." });
            controller.close();
          } catch (_) {}
        }, 45_000);

        for await (const event of graph.streamEvents(input, config)) {
          // ── Tool started ────────────────────────────────────────────
          if (event.event === "on_tool_start") {
            if (!toolsMade.includes(event.name)) {
              toolsMade.push(event.name);
              sse(controller, { type: "tool_call", tool: event.name });
            }
          }

          // ── LLM streaming tokens ────────────────────────────────────
          if (event.event === "on_chat_model_stream") {
            const chunk = event.data?.chunk;
            const text =
              typeof chunk?.content === "string"
                ? chunk.content
                : Array.isArray(chunk?.content)
                ? chunk.content
                    .filter((c: { type: string }) => c.type === "text")
                    .map((c: { text: string }) => c.text)
                    .join("")
                : "";
            if (text) {
              assistantText += text;
              sse(controller, { type: "token", content: text });
            }
          }

          // ── Interrupt (calendar confirmation, etc.) ─────────────────
          if (
            event.event === "on_chain_stream" &&
            event.data?.chunk?.__interrupt__
          ) {
            const intr = event.data.chunk.__interrupt__[0]?.value;
            if (intr && !interruptSent) {
              interruptSent = true;
              sse(controller, {
                type: "interrupt",
                content: intr.question,
                details: intr.details ?? {},
              });
              // Send done so frontend stops waiting and shows the interrupt card
              sse(controller, { type: "done" });
              if (timeoutId) clearTimeout(timeoutId);
              controller.close();
              return; // Wait for /resume
            }
          }

          // NOTE: Do NOT add an early break on on_chat_model_end.
          // The graph runs: agent → tools → agent (second pass with tool results)
          // Breaking early cuts off the second agent response — the actual answer.
        }

        if (timeoutId) clearTimeout(timeoutId);

        // Save final assistant message to DB
        if (assistantText) {
          await prisma.message.create({
            data: {
              threadId: params.threadId,
              role: "assistant",
              content: assistantText,
              toolCalls: toolsMade,
            },
          });

          await prisma.thread.update({
            where: { id: params.threadId },
            data: {
              title: isFirstMessage ? userMessage.slice(0, 50) : undefined,
              updatedAt: new Date(),
            },
          });
        }

        sse(controller, { type: "done" });
        controller.close();
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        console.error("[chat route] error:", err);
        try {
          sse(controller, {
            type: "error",
            message: (err as Error).message || "An error occurred",
          });
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
