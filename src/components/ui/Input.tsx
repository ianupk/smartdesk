import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, style, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn("w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors", className)}
          style={{
            background: "var(--bg-2)",
            border: error ? "1px solid #ef4444" : "1px solid var(--border)",
            color: "var(--text)",
            ...style,
          }}
          {...props}
        />
        {error && (
          <p className="text-xs px-1" style={{ color: "#ef4444" }}>{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs px-1" style={{ color: "var(--text-3)" }}>{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
