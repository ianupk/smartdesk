"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); setLoading(true);
        const result = await signIn("credentials", { email, password, redirect: false });
        if (result?.error) { setError("Invalid email or password."); setLoading(false); }
        else router.push("/dashboard");
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-1.5 mb-6">
                        <span className="font-bold text-lg" style={{ color: "var(--text)" }}>SmartDesk</span>
                        <span className="text-[0.55rem] font-mono tracking-widest font-semibold" style={{ color: "var(--accent)" }}>AI</span>
                    </div>
                    <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Welcome back</h1>
                    <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>Sign in to your account</p>
                </div>

                <div className="rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}>
                    <button onClick={() => { setGoogleLoading(true); signIn("google", { callbackUrl: "/dashboard" }); }} disabled={googleLoading}
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                        style={{ border: "1px solid var(--border)", color: "var(--text-2)", background: "var(--bg-2)" }}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        Continue with Google
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                        <span className="text-xs" style={{ color: "var(--text-3)" }}>or</span>
                        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <Input id="email" type="email" label="Email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"/>
                        <Input id="password" type="password" label="Password" placeholder="..." value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" error={error}/>
                        <Button type="submit" className="w-full" loading={loading}>Sign in</Button>
                    </form>
                </div>

                <p className="text-center text-sm mt-5" style={{ color: "var(--text-3)" }}>
                    No account?{" "}
                    <Link href="/register" className="font-medium" style={{ color: "var(--accent)" }}>Create one</Link>
                </p>
            </div>
        </div>
    );
}
