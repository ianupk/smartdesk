import { cn } from "@/lib/utils";

interface BadgeProps {
    children: React.ReactNode;
    variant?: "default" | "success" | "accent" | "danger";
    className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
    const styles: Record<string, React.CSSProperties> = {
        default: { background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text-3)" },
        success: { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" },
        accent:  { background: "var(--accent-2)", border: "1px solid rgba(217,119,6,0.22)", color: "var(--accent)" },
        danger:  { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" },
    };

    return (
        <span
            className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", className)}
            style={styles[variant]}
        >
            {children}
        </span>
    );
}
