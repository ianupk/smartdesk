import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function RootPage() {
    const session = await getServerSession(authOptions);
    if (session) redirect("/dashboard");
    // Show landing page for unauthenticated users
    return <LandingPage />;
}

function LandingPage() {
    return (
        <>
            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes glowPulse {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50%       { opacity: 0.8; transform: scale(1.05); }
                }
                @keyframes gridMove {
                    from { transform: translateY(0); }
                    to   { transform: translateY(48px); }
                }
                @keyframes floatA {
                    0%, 100% { transform: translateY(0px) translateX(0px); }
                    33%      { transform: translateY(-12px) translateX(6px); }
                    66%      { transform: translateY(6px) translateX(-8px); }
                }
                @keyframes floatB {
                    0%, 100% { transform: translateY(0px) translateX(0px); }
                    40%      { transform: translateY(10px) translateX(-6px); }
                    70%      { transform: translateY(-8px) translateX(10px); }
                }
                .anim-1 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.1s both; }
                .anim-2 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.25s both; }
                .anim-3 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.4s both; }
                .anim-4 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.55s both; }
                .anim-5 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.7s both; }
                .glow-orb { animation: glowPulse 4s ease-in-out infinite; }
                .float-a  { animation: floatA 8s ease-in-out infinite; }
                .float-b  { animation: floatB 11s ease-in-out infinite; }
                .grid-bg  { animation: gridMove 4s linear infinite; }
                .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(217,119,6,0.35); }
                .btn-primary { transition: transform 0.2s ease, box-shadow 0.2s ease; }
                .btn-ghost:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.14); }
                .btn-ghost { transition: background 0.2s ease, border-color 0.2s ease; }
                .feature-card:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); transform: translateY(-2px); }
                .feature-card { transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease; }
                .integration-pill:hover { border-color: rgba(217,119,6,0.3); background: rgba(217,119,6,0.06); }
                .integration-pill { transition: border-color 0.2s ease, background 0.2s ease; }
            `}</style>

            <div style={{ background: "var(--bg)", minHeight: "100vh", fontFamily: "'Geist', system-ui, sans-serif", color: "var(--text)", overflow: "hidden" }}>

                {/* ── Background atmosphere ── */}
                <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
                    {/* Dot grid */}
                    <div className="grid-bg" style={{
                        position: "absolute", inset: "-48px 0 0",
                        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)",
                        backgroundSize: "48px 48px",
                    }} />
                    {/* Ambient glow — top center */}
                    <div className="glow-orb" style={{
                        position: "absolute", top: "-120px", left: "50%", transform: "translateX(-50%)",
                        width: 600, height: 500,
                        background: "radial-gradient(ellipse at center, rgba(217,119,6,0.12) 0%, transparent 70%)",
                        borderRadius: "50%",
                    }} />
                    {/* Subtle accent — bottom right */}
                    <div style={{
                        position: "absolute", bottom: "-200px", right: "-100px",
                        width: 500, height: 500,
                        background: "radial-gradient(ellipse at center, rgba(217,119,6,0.06) 0%, transparent 70%)",
                        borderRadius: "50%",
                    }} />
                </div>

                {/* ── Nav ── */}
                <nav style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    {/* Brand */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 9,
                            background: "linear-gradient(135deg, #d97706, #f59e0b)",
                            boxShadow: "0 2px 12px rgba(217,119,6,0.35)",
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                            <svg viewBox="0 0 16 16" fill="none" width="18" height="18" style={{ color: "#fff" }}>
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                    d="M3.25 5.25v5.5m7.5-7.5h-5.5m7.5 2v5.5m-2 2h-5.5m6.5-2h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm-9 0h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm0-9h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm9 0h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Z"/>
                            </svg>
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>SmartDesk</span>
                        <span style={{
                            fontSize: 9, fontFamily: "monospace", fontWeight: 700, padding: "2px 6px",
                            borderRadius: 4, background: "rgba(217,119,6,0.12)",
                            border: "1px solid rgba(217,119,6,0.22)", color: "#d97706", letterSpacing: "0.05em",
                        }}>AI</span>
                    </div>

                    {/* Nav links */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Link href="/login" className="btn-ghost" style={{
                            padding: "8px 18px", borderRadius: 10, fontSize: 14, fontWeight: 500,
                            color: "var(--text-2)", border: "1px solid transparent", textDecoration: "none",
                        }}>Sign in</Link>
                        <Link href="/register" className="btn-primary" style={{
                            padding: "8px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                            background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#fff",
                            textDecoration: "none", boxShadow: "0 2px 12px rgba(217,119,6,0.25)",
                        }}>Get started</Link>
                    </div>
                </nav>

                {/* ── Hero ── */}
                <section style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "80px 24px 60px" }}>

                    {/* Badge */}
                    <div className="anim-1" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 32,
                        padding: "6px 14px 6px 8px", borderRadius: 999,
                        background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)" }}>
                        <span style={{
                            width: 20, height: 20, borderRadius: 6,
                            background: "linear-gradient(135deg, #d97706, #f59e0b)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <svg viewBox="0 0 16 16" fill="none" width="12" height="12" style={{ color: "#fff" }}>
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                    d="M3.25 5.25v5.5m7.5-7.5h-5.5m7.5 2v5.5m-2 2h-5.5m6.5-2h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm-9 0h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm0-9h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm9 0h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Z"/>
                            </svg>
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#d97706", letterSpacing: "0.02em" }}>AI-Powered Productivity</span>
                    </div>

                    {/* Headline */}
                    <h1 className="anim-2" style={{
                        fontSize: "clamp(40px, 7vw, 72px)", fontWeight: 700, lineHeight: 1.08,
                        letterSpacing: "-0.04em", marginBottom: 20, maxWidth: 820, margin: "0 auto 20px",
                        color: "var(--text)",
                    }}>
                        Your work, unified.<br />
                        <span style={{
                            background: "linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}>Managed by AI.</span>
                    </h1>

                    {/* Sub */}
                    <p className="anim-3" style={{
                        fontSize: 18, lineHeight: 1.6, color: "var(--text-3)",
                        maxWidth: 520, margin: "0 auto 44px", fontWeight: 400,
                    }}>
                        SmartDesk connects your Gmail, Calendar, Slack, GitHub, and more — then lets one AI assistant handle them all.
                    </p>

                    {/* CTAs */}
                    <div className="anim-4" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                        <Link href="/register" className="btn-primary" style={{
                            display: "inline-flex", alignItems: "center", gap: 8,
                            padding: "13px 28px", borderRadius: 13, fontSize: 15, fontWeight: 600,
                            background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#fff",
                            textDecoration: "none", boxShadow: "0 4px 24px rgba(217,119,6,0.3)",
                        }}>
                            Start for free
                            <svg viewBox="0 0 24 24" fill="none" width="16" height="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                            </svg>
                        </Link>
                        <Link href="/login" className="btn-ghost" style={{
                            display: "inline-flex", alignItems: "center", gap: 8,
                            padding: "13px 28px", borderRadius: 13, fontSize: 15, fontWeight: 500,
                            color: "var(--text-2)", border: "1px solid rgba(255,255,255,0.08)",
                            textDecoration: "none", background: "rgba(255,255,255,0.03)",
                        }}>
                            Sign in
                        </Link>
                    </div>

                </section>

                {/* ── Integration pills ── */}
                <section style={{ position: "relative", zIndex: 10, padding: "0 24px 72px" }}>
                    <p style={{ textAlign: "center", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 20 }}>
                        connects with your entire stack
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
                        {([
                            {
                                name: "Gmail",
                                logo: <svg viewBox="0 0 24 24" width="18" height="18"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
                            },
                            {
                                name: "Calendar",
                                logo: <svg viewBox="0 0 24 24" width="18" height="18"><rect x="2" y="4" width="20" height="18" rx="2" fill="#1a73e8"/><path d="M2 8h20v2H2z" fill="#1557b0"/><rect x="7" y="1" width="2.5" height="5" rx="1.25" fill="#4285F4"/><rect x="14.5" y="1" width="2.5" height="5" rx="1.25" fill="#4285F4"/><text x="12" y="19" textAnchor="middle" fill="#fff" fontSize="6.5" fontWeight="700" fontFamily="sans-serif">31</text></svg>,
                            },
                            {
                                name: "Slack",
                                logo: <svg viewBox="0 0 24 24" width="18" height="18"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A"/><path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/><path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0"/><path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/><path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#2EB67D"/><path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/><path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E"/><path d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/></svg>,
                            },
                            {
                                name: "GitHub",
                                logo: <svg viewBox="0 0 24 24" width="18" height="18" fill="#e8e8f0"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>,
                            },
                            {
                                name: "Zoom",
                                logo: <svg viewBox="0 0 24 24" width="18" height="18"><rect width="24" height="24" rx="5" fill="#2D8CFF"/><path d="M14.5 8H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h9.5a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 14.5 8zm4.146 1.269L16 11v2l2.646 1.731A.75.75 0 0 0 20 14.1V9.9a.75.75 0 0 0-1.354-.631z" fill="#fff"/></svg>,
                            },
                            {
                                name: "Todoist",
                                logo: <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="12" fill="#DB4035"/><path d="M6 8.5l2.5 2.5L14 5M6 12.5l2.5 2.5L14 9M6 16.5l2.5 2.5L14 13" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
                            },
                        ] as { name: string; logo: React.ReactNode }[]).map(({ name, logo }) => (
                            <div key={name} className="integration-pill" style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "8px 16px", borderRadius: 999,
                                background: "var(--bg-2)", border: "1px solid var(--border)",
                                cursor: "default",
                            }}>
                                <span style={{ display: "flex", alignItems: "center" }}>{logo}</span>
                                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>{name}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Feature grid ── */}
                <section style={{ position: "relative", zIndex: 10, padding: "0 24px 80px", maxWidth: 1000, margin: "0 auto" }}>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: 16,
                    }}>
                        {[
                            {
                                icon: (
                                    <svg viewBox="0 0 24 24" fill="none" width="22" height="22" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                    </svg>
                                ),
                                title: "One AI for everything",
                                desc: "Ask anything across your tools. No more switching tabs — SmartDesk handles it all in a single conversation.",
                            },
                            {
                                icon: (
                                    <svg viewBox="0 0 24 24" fill="none" width="22" height="22" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                                    </svg>
                                ),
                                title: "All your tools, one place",
                                desc: "Connect Gmail, Slack, GitHub, Calendar, Zoom and Todoist. Ask one question, get answers from all of them.",
                            },
                            {
                                icon: (
                                    <svg viewBox="0 0 24 24" fill="none" width="22" height="22" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                ),
                                title: "Private by design",
                                desc: "Your data stays yours. End-to-end encrypted connections, no training on your content, ever.",
                            },
                        ].map(({ icon, title, desc }) => (
                            <div key={title} className="feature-card" style={{
                                padding: "28px", borderRadius: 18,
                                background: "var(--bg-1)", border: "1px solid var(--border)",
                            }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12, marginBottom: 18,
                                    background: "var(--bg-3)", border: "1px solid var(--border)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: "var(--accent)",
                                }}>
                                    {icon}
                                </div>
                                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, letterSpacing: "-0.01em", color: "var(--text)" }}>{title}</h3>
                                <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text-3)", margin: 0 }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── CTA banner ── */}
                <section style={{ position: "relative", zIndex: 10, padding: "0 24px 80px" }}>
                    <div style={{
                        maxWidth: 640, margin: "0 auto", textAlign: "center",
                        padding: "52px 32px", borderRadius: 24,
                        background: "var(--bg-1)", border: "1px solid rgba(217,119,6,0.18)",
                        boxShadow: "0 0 60px rgba(217,119,6,0.08)",
                        position: "relative", overflow: "hidden",
                    }}>
                        {/* Subtle amber glow behind */}
                        <div style={{
                            position: "absolute", top: "50%", left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: 400, height: 200,
                            background: "radial-gradient(ellipse, rgba(217,119,6,0.1) 0%, transparent 70%)",
                            pointerEvents: "none",
                        }} />
                        <div style={{ position: "relative" }}>
                            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 12, color: "var(--text)" }}>
                                Ready to work smarter?
                            </h2>
                            <p style={{ fontSize: 15, color: "var(--text-3)", marginBottom: 32, lineHeight: 1.6 }}>
                                Set up in under 2 minutes. No credit card required.
                            </p>
                            <Link href="/register" className="btn-primary" style={{
                                display: "inline-flex", alignItems: "center", gap: 8,
                                padding: "13px 32px", borderRadius: 13, fontSize: 15, fontWeight: 600,
                                background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#fff",
                                textDecoration: "none", boxShadow: "0 4px 24px rgba(217,119,6,0.3)",
                            }}>
                                Create free account
                                <svg viewBox="0 0 24 24" fill="none" width="16" height="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                                </svg>
                            </Link>
                            <p style={{ marginTop: 16, fontSize: 12, color: "var(--text-3)" }}>
                                Already have an account?{" "}
                                <Link href="/login" style={{ color: "#d97706", textDecoration: "none", fontWeight: 500 }}>Sign in →</Link>
                            </p>
                        </div>
                    </div>
                </section>

                {/* ── Footer ── */}
                <footer style={{
                    position: "relative", zIndex: 10,
                    borderTop: "1px solid var(--border)",
                    padding: "24px 40px",
                    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                            width: 24, height: 24, borderRadius: 7,
                            background: "linear-gradient(135deg, #d97706, #f59e0b)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <svg viewBox="0 0 16 16" fill="none" width="13" height="13" style={{ color: "#fff" }}>
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                    d="M3.25 5.25v5.5m7.5-7.5h-5.5m7.5 2v5.5m-2 2h-5.5m6.5-2h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm-9 0h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm0-9h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm9 0h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Z"/>
                            </svg>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-3)" }}>SmartDesk AI</span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
                        © {new Date().getFullYear()} SmartDesk
                    </p>
                </footer>
            </div>
        </>
    );
}
