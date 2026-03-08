import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = "primary",
            size = "md",
            loading,
            children,
            disabled,
            ...props
        },
        ref,
    ) => {
        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={cn(
                    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                    {
                        "bg-accent hover:bg-accent/90 text-white shadow-glow-accent":
                            variant === "primary",
                        "bg-surface-3 hover:bg-surface-4 border border-border text-ink-dim hover:text-ink":
                            variant === "secondary",
                        "text-ink-muted hover:text-ink hover:bg-surface-2":
                            variant === "ghost",
                        "bg-danger/10 hover:bg-danger/20 border border-danger/30 text-danger":
                            variant === "danger",
                    },
                    {
                        "text-xs px-3 py-1.5": size === "sm",
                        "text-sm px-4 py-2.5": size === "md",
                        "text-base px-6 py-3": size === "lg",
                    },
                    className,
                )}
                {...props}
            >
                {loading ? (
                    <span className="flex items-center gap-2">
                        <svg
                            className="animate-spin w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                        </svg>
                        {children}
                    </span>
                ) : (
                    children
                )}
            </button>
        );
    },
);
Button.displayName = "Button";
