import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, style, ...props }, ref) => {
    const isPrimary = variant === "primary";
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
          {
            "text-white": isPrimary,
            "border text-[var(--text-2)] hover:text-[var(--text)]": variant === "secondary",
            "text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--bg-3)]": variant === "ghost",
            "border text-red-400 hover:text-red-300": variant === "danger",
          },
          {
            "text-xs px-3 py-1.5": size === "sm",
            "text-sm px-4 py-2.5": size === "md",
            "text-base px-6 py-3": size === "lg",
          },
          className
        )}
        style={{
          ...(isPrimary ? { background: "linear-gradient(135deg, var(--accent), #f59e0b)" } : {}),
          ...(variant === "secondary" ? { background: "var(--bg-3)", borderColor: "var(--border)" } : {}),
          ...(variant === "danger" ? { background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)" } : {}),
          ...style,
        }}
        onMouseEnter={e => {
          if (disabled || loading) return;
          if (isPrimary) {
            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px var(--accent-glow)";
          }
        }}
        onMouseLeave={e => {
          if (isPrimary) {
            (e.currentTarget as HTMLElement).style.transform = "";
            (e.currentTarget as HTMLElement).style.boxShadow = "";
          }
        }}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {children}
          </span>
        ) : children}
      </button>
    );
  }
);
Button.displayName = "Button";
