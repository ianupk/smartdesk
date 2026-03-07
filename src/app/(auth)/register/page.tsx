"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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

        // Auto sign-in after registration
        await signIn("credentials", {
            email: form.email,
            password: form.password,
            redirect: false,
        });
        router.push("/dashboard");
    };

    const handleGoogle = async () => {
        setGoogleLoading(true);
        await signIn("google", { callbackUrl: "/dashboard" });
    };

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-4">
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    backgroundImage:
                        "radial-gradient(circle at 1px 1px, rgba(124,106,247,0.04) 1px, transparent 0)",
                    backgroundSize: "32px 32px",
                }}
            />

            <div className="relative w-full max-w-sm animate-slide-up">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-accent-dim border border-accent/30 flex items-center justify-center text-2xl mx-auto mb-4">
                        ⚡
                    </div>
                    <h1 className="font-display text-3xl font-bold text-ink">
                        Create account
                    </h1>
                    <p className="text-sm text-ink-muted mt-1">
                        Start managing smarter with SmartDesk
                    </p>
                </div>

                <div className="card p-6 space-y-4">
                    <Button
                        variant="secondary"
                        className="w-full"
                        onClick={handleGoogle}
                        loading={googleLoading}
                    >
                        <GoogleIcon />
                        Sign up with Google
                    </Button>

                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-ink-muted font-mono">
                            or
                        </span>
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            id="name"
                            label="Full name"
                            placeholder="Jane Smith"
                            value={form.name}
                            onChange={set("name")}
                            required
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
                        <Button
                            type="submit"
                            className="w-full"
                            loading={loading}
                        >
                            Create account
                        </Button>
                    </form>
                </div>

                <p className="text-center text-sm text-ink-muted mt-6">
                    Already have an account?{" "}
                    <Link
                        href="/login"
                        className="text-accent hover:underline font-medium"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}

function GoogleIcon() {
    return (
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
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    );
}
