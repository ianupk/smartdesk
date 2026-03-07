"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThreadSidebar } from "@/components/chat/ThreadSidebar";
import { Button } from "@/components/ui/Button";

export default function ChatIndexPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const startNewThread = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/threads", { method: "POST" });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}: ${await res.text()}`);
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
        <div className="flex h-full">
            <ThreadSidebar />
            <div className="flex-1 flex items-center justify-center bg-surface">
                <div className="text-center space-y-4 animate-fade-in">
                    <div className="w-16 h-16 rounded-2xl bg-accent-dim border border-accent/20 flex items-center justify-center text-3xl mx-auto">
                        ◎
                    </div>
                    <h2 className="font-display text-xl font-semibold text-ink">
                        No conversation selected
                    </h2>
                    <p className="text-sm text-ink-muted">
                        Select a thread from the left or start a new one.
                    </p>
                    <Button onClick={startNewThread} loading={loading}>
                        + New conversation
                    </Button>
                </div>
            </div>
        </div>
    );
}
