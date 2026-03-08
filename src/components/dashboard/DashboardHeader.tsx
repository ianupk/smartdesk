"use client";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

const LOGOS = [
    { name: "Gmail", key: "googleAccessToken", svg: <svg viewBox="0 0 24 24" className="w-4 h-4"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> },
    { name: "Calendar", key: "googleAccessToken", svg: <svg viewBox="0 0 24 24" className="w-4 h-4"><rect x="2" y="4" width="20" height="18" rx="2" fill="#1a73e8"/><rect x="2" y="4" width="20" height="6" rx="2" fill="#1a73e8"/><path d="M2 8h20v2H2z" fill="#1557b0"/><rect x="7" y="1" width="2.5" height="5" rx="1.25" fill="#4285F4"/><rect x="14.5" y="1" width="2.5" height="5" rx="1.25" fill="#4285F4"/><text x="12" y="19" textAnchor="middle" fill="#fff" fontSize="6.5" fontWeight="700" fontFamily="sans-serif">31</text></svg> },
    { name: "Slack", key: "hasSlack", svg: <svg viewBox="0 0 24 24" className="w-4 h-4"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A"/><path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/><path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0"/><path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/><path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#2EB67D"/><path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/><path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E"/><path d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/></svg> },
    { name: "Zoom", key: "hasZoom", svg: <svg viewBox="0 0 24 24" className="w-4 h-4"><rect width="24" height="24" rx="4" fill="#2D8CFF"/><path d="M14.5 8H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h9.5a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 14.5 8zm4.146 1.269L16 11v2l2.646 1.731A.75.75 0 0 0 20 14.1V9.9a.75.75 0 0 0-1.354-.631z" fill="#fff"/></svg> },
    { name: "GitHub", key: "hasGithub", svg: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg> },
    { name: "Todoist", key: "hasTodoist", svg: <svg viewBox="0 0 24 24" className="w-4 h-4"><circle cx="12" cy="12" r="12" fill="#DB4035"/><path d="M6 8.5l2.5 2.5L14 5M6 12.5l2.5 2.5L14 9M6 16.5l2.5 2.5L14 13" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg> },
];

export function DashboardHeader() {
    const { data: session } = useSession();
    const s = session as Record<string, unknown> | null;

    return (
        <header className="sticky top-0 z-10 border-b" style={{ background: "var(--bg-1)", borderColor: "var(--border)" }}>
            <div className="max-w-5xl mx-auto px-8 h-14 flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-1.5">
                    <span className="font-bold text-sm" style={{ color: "var(--text)" }}>SmartDesk</span>
                    <span className="text-[0.5rem] font-mono tracking-widest font-semibold" style={{ color: "var(--accent)" }}>AI</span>
                </Link>

                {/* Centered logos */}
                <div className="flex items-center gap-2">
                    {LOGOS.map((logo) => {
                        const connected = !!s?.[logo.key];
                        return (
                            <div key={logo.name} className="relative group">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${connected ? "opacity-90" : "opacity-20 grayscale"}`}
                                    style={{ background: "var(--bg-3)" }}>
                                    {logo.svg}
                                </div>
                                {connected && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border" style={{ background: "#22c55e", borderColor: "var(--bg-1)", boxShadow: "0 0 5px rgba(34,197,94,0.6)" }} />}
                                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
                                    style={{ background: "var(--bg-3)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
                                    {logo.name}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={{ background: "var(--bg-3)", color: "var(--text-2)" }}>
                        {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <button onClick={() => signOut({ callbackUrl: "/login" })}
                        title="Sign out"
                        className="transition-colors"
                        style={{ color: "var(--text-3)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
}
