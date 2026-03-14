"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModernChatSidebar } from "@/components/chat/ModernChatSidebar";
import { Spinner } from "@/components/ui/Spinner";

export default function ChatIndexPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const startNewThread = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/threads", { method: "POST" });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const thread = await res.json();
            router.push(`/chat/${thread.id}`);
        } catch (err) {
            console.error("[newThread]", err);
            alert("Could not create a conversation. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-full">
            <ModernChatSidebar />
            <div className="flex-1 flex items-center justify-center p-6" style={{ background: "var(--bg)" }}>
                <div className="text-center max-w-xs">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                        style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
                    >
                        <svg
                            className="w-6 h-6"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ color: "var(--text-3)" }}
                        >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <h2 className="text-base font-semibold mb-1.5" style={{ color: "var(--text)" }}>
                        No conversation selected
                    </h2>
                    <p className="text-sm mb-6" style={{ color: "var(--text-3)" }}>
                        Select a thread or start a new one.
                    </p>
                    <button
                        onClick={startNewThread}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all duration-150"
                        style={{ background: "linear-gradient(135deg, var(--accent), #f59e0b)" }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                            (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px var(--accent-glow)";
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.transform = "";
                            (e.currentTarget as HTMLElement).style.boxShadow = "";
                        }}
                    >
                        {loading ? (
                            <Spinner className="w-4 h-4" />
                        ) : (
                            <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                        )}
                        New conversation
                    </button>
                </div>
            </div>
        </div>
    );
}
