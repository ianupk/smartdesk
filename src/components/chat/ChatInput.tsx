"use client";
import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
    value: string;
    onChange: (v: string) => void;
    onSend: () => void;
    disabled?: boolean;
    placeholder?: string;
}

export function ChatInput({ value, onChange, onSend, disabled, placeholder }: ChatInputProps) {
    const ref = useRef<HTMLTextAreaElement>(null);

    const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        const el = ref.current;
        if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 140) + "px"; }
    };

    const canSend = value.trim() && !disabled;

    return (
        <div
            className={cn("flex items-end gap-3 rounded-2xl px-4 py-3 transition-all duration-200")}
            style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
            }}
            onFocusCapture={e => {
                const p = e.currentTarget as HTMLElement;
                p.style.borderColor = "rgba(217,119,6,0.35)";
                p.style.boxShadow = "0 0 0 3px var(--accent-glow)";
            }}
            onBlurCapture={e => {
                const p = e.currentTarget as HTMLElement;
                p.style.borderColor = "var(--border)";
                p.style.boxShadow = "none";
            }}
        >
            <textarea
                ref={ref}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKey}
                disabled={disabled}
                placeholder={placeholder ?? "Ask SmartDesk anything…"}
                rows={1}
                className="flex-1 bg-transparent border-none outline-none resize-none text-sm leading-relaxed min-h-6 max-h-36 disabled:opacity-50"
                style={{ color: "var(--text)", caretColor: "var(--accent)" }}
            />
            <button
                onClick={onSend}
                disabled={!canSend}
                title="Send (Enter)"
                className={cn(
                    "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150",
                    canSend ? "text-white" : "cursor-not-allowed opacity-30"
                )}
                style={{
                    background: canSend ? "linear-gradient(135deg, var(--accent), #f59e0b)" : "var(--bg-3)",
                    boxShadow: canSend ? "0 2px 12px var(--accent-glow)" : "none",
                    transform: "scale(1)",
                }}
                onMouseEnter={e => { if (canSend) (e.currentTarget as HTMLElement).style.transform = "scale(1.08)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
            </button>
        </div>
    );
}
