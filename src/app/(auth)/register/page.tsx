"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const AppIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" style={{ color: "#fff" }}>
        <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M3.25 5.25v5.5m7.5-7.5h-5.5m7.5 2v5.5m-2 2h-5.5m6.5-2h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm-9 0h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm0-9h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm9 0h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Z"
        />
    </svg>
);

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
            setErrors({ general: data.error });
            setLoading(false);
            return;
        }
        await signIn("credentials", { email: form.email, password: form.password, redirect: false });
        router.push("/dashboard");
    };

    const handleGoogle = async () => {
        setGoogleLoading(true);
        await signIn("google", { callbackUrl: "/dashboard" });
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: "var(--bg)" }}>
            <div className="w-full max-w-sm">
                {/* Brand */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{
                                background: "linear-gradient(135deg, var(--accent), #f59e0b)",
                                boxShadow: "0 4px 16px var(--accent-glow)",
                            }}
                        >
                            <AppIcon />
                        </div>
                        <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
                            SmartDesk
                        </span>
                        <span
                            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                            style={{
                                background: "var(--accent-2)",
                                color: "var(--accent)",
                                border: "1px solid rgba(217,119,6,0.22)",
                            }}
                        >
                            AI
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                        Create your account
                    </h1>
                    <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
                        Start managing smarter with SmartDesk
                    </p>
                </div>

                {/* Card */}
                <div
                    className="rounded-2xl p-6 space-y-4"
                    style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}
                >
                    {/* Google */}
                    <button
                        onClick={handleGoogle}
                        disabled={googleLoading}
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 disabled:opacity-50"
                        style={{ border: "1px solid var(--border)", color: "var(--text-2)", background: "var(--bg-2)" }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "var(--bg-3)";
                            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "var(--bg-2)";
                            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                        }}
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Continue with Google
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                        <span className="text-xs" style={{ color: "var(--text-3)" }}>
                            or
                        </span>
                        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <Input
                            id="name"
                            type="text"
                            label="Full name"
                            placeholder="Anup Kumar"
                            value={form.name}
                            onChange={set("name")}
                            required
                            autoComplete="name"
                        />
                        <Input
                            id="email"
                            type="email"
                            label="Email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={set("email")}
                            required
                            autoComplete="email"
                        />
                        <Input
                            id="password"
                            type="password"
                            label="Password"
                            placeholder="At least 8 characters"
                            value={form.password}
                            onChange={set("password")}
                            required
                            hint="Minimum 8 characters"
                            error={errors.general}
                        />
                        <Button type="submit" className="w-full" loading={loading}>
                            Create account
                        </Button>
                    </form>
                </div>

                <p className="text-center text-sm mt-5" style={{ color: "var(--text-3)" }}>
                    Already have an account?{" "}
                    <Link
                        href="/login"
                        className="font-medium transition-opacity hover:opacity-80"
                        style={{ color: "var(--accent)" }}
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
