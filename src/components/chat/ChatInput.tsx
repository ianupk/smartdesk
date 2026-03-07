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

export function ChatInput({
    value,
    onChange,
    onSend,
    disabled,
    placeholder,
}: ChatInputProps) {
    const ref = useRef<HTMLTextAreaElement>(null);

    const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    // Auto-resize textarea
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        const el = ref.current;
        if (el) {
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 140) + "px";
        }
    };

    return (
        <div
            className={cn(
                "flex items-end gap-3 bg-surface-2 border border-border rounded-xl px-4 py-3",
                "focus-within:border-accent/60 focus-within:ring-1 focus-within:ring-accent/20 transition-all",
            )}
        >
            <textarea
                ref={ref}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKey}
                disabled={disabled}
                placeholder={placeholder ?? "Ask SmartDesk anything…"}
                rows={1}
                className={cn(
                    "flex-1 bg-transparent border-none outline-none resize-none",
                    "text-sm text-ink placeholder:text-ink-muted leading-relaxed",
                    "min-h-6 max-h-36 disabled:opacity-50",
                )}
            />
            <button
                onClick={onSend}
                disabled={disabled || !value.trim()}
                className={cn(
                    "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    value.trim() && !disabled
                        ? "bg-accent hover:bg-accent/90 text-white"
                        : "bg-surface-3 text-ink-muted cursor-not-allowed",
                )}
                title="Send (Enter)"
            >
                <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                >
                    <path
                        d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>
        </div>
    );
}
