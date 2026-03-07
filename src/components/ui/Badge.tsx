import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "accent";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[0.65rem] px-2 py-0.5 rounded border tracking-wide",
        {
          "bg-surface-3 border-border text-ink-muted": variant === "default",
          "bg-success/10 border-success/30 text-success": variant === "success",
          "bg-warning/10 border-warning/30 text-warning": variant === "warning",
          "bg-danger/10 border-danger/30 text-danger": variant === "danger",
          "bg-accent-dim border-accent/30 text-accent": variant === "accent",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
