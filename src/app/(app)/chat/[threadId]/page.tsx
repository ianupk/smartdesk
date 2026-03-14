"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ModernChatSidebar } from "@/components/chat/ModernChatSidebar";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { ToolIndicator } from "@/components/chat/ToolIndicator";
import { InterruptCard } from "@/components/chat/InterruptCard";
import { SuggestionGrid } from "@/components/chat/SuggestionGrid";
import { Spinner } from "@/components/ui/Spinner";
import { v4 as uuid } from "uuid";
import type { ChatMessage as ChatMessageType, StreamEvent } from "@/types";

interface InterruptState {
    question: string;
    details: Record<string, unknown>;
}

export default function ChatThreadPage() {
    const { threadId } = useParams<{ threadId: string }>();
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [streamingText, setStreamingText] = useState("");
    const [interrupt, setInterrupt] = useState<InterruptState | null>(null);
    const [interruptLoading, setInterruptLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!threadId) return;
        setInitialLoad(true);
        fetch(`/api/threads/${threadId}`)
            .then((r) => r.json())
            .then(({ thread }) => {
                if (thread?.messages) {
                    setMessages(
                        thread.messages.map(
                            (m: {
                                id: string;
                                role: string;
                                content: string;
                                toolCalls: string[];
                                createdAt: string;
                            }) => ({
                                id: m.id,
                                role: m.role as "user" | "assistant",
                                content: m.content,
                                toolCalls: m.toolCalls,
                                createdAt: new Date(m.createdAt),
                            }),
                        ),
                    );
                }
                setInitialLoad(false);
            })
            .catch(() => setInitialLoad(false));
    }, [threadId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamingText, interrupt, activeTool]);

    const streamRequest = useCallback(
        async (body: object) => {
            setLoading(true);
            setActiveTool(null);
            setStreamingText("");
            setInterrupt(null);

            let accumulated = "";
            const toolsMade: string[] = [];

            try {
                const res = await fetch(`/api/chat/${threadId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const reader = res.body!.getReader();
                const dec = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const lines = dec.decode(value).split("\n");
                    for (const line of lines) {
                        if (!line.startsWith("data: ")) continue;
                        const event: StreamEvent & {
                            details?: Record<string, unknown>;
                        } = JSON.parse(line.slice(6));

                        if (event.type === "tool_call" && event.tool) {
                            setActiveTool(event.tool);
                            toolsMade.push(event.tool);
                        }
                        if (event.type === "token" && event.content) {
                            accumulated += event.content;
                            setStreamingText(accumulated);
                        }
                        if (event.type === "interrupt" && event.content) {
                            setInterrupt({
                                question: event.content,
                                details: event.details ?? {},
                            });
                            setActiveTool(null);
                            setLoading(false);
                            setStreamingText("");
                            return;
                        }
                        if (event.type === "done") {
                            setActiveTool(null);
                            setStreamingText("");
                            if (accumulated)
                                setMessages((prev) => [
                                    ...prev,
                                    {
                                        id: uuid(),
                                        role: "assistant",
                                        content: accumulated,
                                        toolCalls: toolsMade,
                                        createdAt: new Date(),
                                    },
                                ]);
                        }
                        if (event.type === "error") {
                            setActiveTool(null);
                            setStreamingText("");
                            setMessages((prev) => [
                                ...prev,
                                {
                                    id: uuid(),
                                    role: "assistant",
                                    content: `⚠ ${event.message}`,
                                    toolCalls: [],
                                    createdAt: new Date(),
                                },
                            ]);
                        }
                    }
                }
            } catch {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: uuid(),
                        role: "assistant",
                        content: "⚠ Connection error. Please try again.",
                        toolCalls: [],
                        createdAt: new Date(),
                    },
                ]);
            }
            setLoading(false);
        },
        [threadId],
    );

    const sendMessage = useCallback(
        (text?: string) => {
            const content = text ?? input.trim();
            if (!content || loading) return;
            setInput("");
            setMessages((prev) => [
                ...prev,
                {
                    id: uuid(),
                    role: "user",
                    content,
                    toolCalls: [],
                    createdAt: new Date(),
                },
            ]);
            streamRequest({ message: content });
        },
        [input, loading, streamRequest],
    );

    const respondToInterrupt = useCallback(
        (confirmed: boolean) => {
            setMessages((prev) => [
                ...prev,
                {
                    id: uuid(),
                    role: "user",
                    content: confirmed ? "✓ Yes, go ahead" : "✗ Cancel",
                    toolCalls: [],
                    createdAt: new Date(),
                },
            ]);
            setInterrupt(null);
            setInterruptLoading(confirmed);
            streamRequest({ resume: confirmed }).finally(() =>
                setInterruptLoading(false),
            );
        },
        [streamRequest],
    );

    if (initialLoad) {
        return (
            <div className="flex flex-col h-full">
                <ModernChatSidebar />
                <div className="flex-1 flex items-center justify-center" style={{ background: "var(--bg)" }}>
                    <Spinner className="w-5 h-5" />
                </div>
            </div>
        );
    }

    return (
        /* On mobile: column layout (top-bar above, chat below).
           On desktop: row layout (sidebar left, chat right). */
        <div className="flex flex-col md:flex-row h-full" style={{ background: "var(--bg)" }}>
            <ModernChatSidebar />

            {/* Chat area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
                <div className="flex-1 overflow-y-auto">
                    {messages.length === 0 && !streamingText ? (
                        /* ── Empty state: Gemini-style inline input + chips ── */
                        <SuggestionGrid
                            onSelect={(t) => sendMessage(t)}
                            inputValue={input}
                            onInputChange={setInput}
                            onSend={() => sendMessage()}
                            disabled={loading}
                        />
                    ) : (
                        <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
                            {messages.map((msg) => (
                                <ChatMessage key={msg.id} message={msg} />
                            ))}
                            {streamingText && (
                                <ChatMessage
                                    message={{
                                        id: "streaming",
                                        role: "assistant",
                                        content: streamingText + "▋",
                                        toolCalls: [],
                                        createdAt: new Date(),
                                    }}
                                />
                            )}
                            {activeTool && <ToolIndicator tool={activeTool} />}
                            {interrupt && (
                                <InterruptCard
                                    question={interrupt.question}
                                    details={interrupt.details}
                                    onConfirm={() => respondToInterrupt(true)}
                                    onCancel={() => respondToInterrupt(false)}
                                    loading={interruptLoading}
                                />
                            )}
                            <div ref={bottomRef} />
                        </div>
                    )}
                </div>

                {/* Bottom input bar — only shown once conversation has started */}
                {(messages.length > 0 || !!streamingText) && (
                    <div className="px-3 py-3 shrink-0"
                        style={{
                            background: "transparent",
                            paddingBottom: "max(12px, env(safe-area-inset-bottom))",
                        }}>
                        <div className="max-w-2xl mx-auto">
                            <ChatInput
                                value={input}
                                onChange={setInput}
                                onSend={() => sendMessage()}
                                disabled={loading || !!interrupt}
                                placeholder={interrupt ? "Respond to the confirmation above…" : "Ask SmartDesk anything…"}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
