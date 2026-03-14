"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function KeyboardShortcuts() {
    const router = useRouter();
    const busy = useRef(false);

    useEffect(() => {
        const handler = async (e: KeyboardEvent) => {
            if (!(e.metaKey || e.ctrlKey) || e.key !== "k") return;
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;
            e.preventDefault();
            if (busy.current) return;
            busy.current = true;
            try {
                const res = await fetch("/api/threads", { method: "POST" });
                if (!res.ok) throw new Error();
                const thread = await res.json();
                router.push("/chat/" + thread.id);
            } catch {
                console.error("[KeyboardShortcuts] failed to create thread");
            } finally {
                setTimeout(() => {
                    busy.current = false;
                }, 800);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [router]);

    return null;
}
