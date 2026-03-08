import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, hint, id, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label
                        htmlFor={id}
                        className="text-sm font-medium text-ink-dim"
                    >
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={id}
                    className={cn(
                        "input-base",
                        error &&
                            "border-danger focus:ring-danger focus:border-danger",
                        className,
                    )}
                    {...props}
                />
                {error && <p className="text-xs text-danger">{error}</p>}
                {hint && !error && (
                    <p className="text-xs text-ink-muted">{hint}</p>
                )}
            </div>
        );
    },
);
Input.displayName = "Input";
