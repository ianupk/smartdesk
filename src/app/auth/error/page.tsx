"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const MESSAGES: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You do not have permission to sign in.",
    Verification: "The sign in link is no longer valid.",
    Default: "An error occurred during authentication.",
};

function ErrorContent() {
    const params = useSearchParams();
    const error = params.get("error") ?? "Default";
    const message = MESSAGES[error] ?? MESSAGES.Default;

    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
            <div className="w-full max-w-sm text-center">
                {/* Icon */}
                <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
                    style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
                >
                    <svg
                        className="w-6 h-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: "#ef4444" }}
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>

                <div
                    className="rounded-2xl p-6 mb-6"
                    style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}
                >
                    <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
                        Authentication Error
                    </h1>
                    <p className="text-sm mb-4" style={{ color: "var(--text-3)" }}>
                        {message}
                    </p>
                    {error !== "Default" && (
                        <p
                            className="text-xs font-mono px-3 py-2 rounded-lg"
                            style={{
                                background: "var(--bg-3)",
                                border: "1px solid var(--border)",
                                color: "var(--text-3)",
                            }}
                        >
                            Error code: {error}
                        </p>
                    )}
                </div>

                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150"
                    style={{ background: "linear-gradient(135deg, var(--accent), #f59e0b)" }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px var(--accent-glow)";
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = "";
                        (e.currentTarget as HTMLElement).style.boxShadow = "";
                    }}
                >
                    ← Back to sign in
                </Link>
            </div>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
                    <div
                        className="w-6 h-6 border-2 rounded-full animate-spin"
                        style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
                    />
                </div>
            }
        >
            <ErrorContent />
        </Suspense>
    );
}
