"use client";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

const IconLogout = () => (
    <svg
        className="w-[15px] h-[15px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
);

// Same clean app icon used in sidebar
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

// Profile popup — same design as sidebar ProfilePopup
function ProfilePopup({
    name,
    email,
    onClose,
    onLogout,
}: {
    name: string;
    email: string;
    onClose: () => void;
    onLogout: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="absolute top-[44px] right-0 z-50 rounded-xl overflow-hidden shadow-2xl"
            style={{ background: "var(--bg-2)", border: "1px solid var(--border)", minWidth: 200 }}
        >
            {/* User info header */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                    {name[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text)" }}>
                        {name}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>
                        {email}
                    </p>
                </div>
            </div>
            {/* Log out */}
            <button
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-all"
                style={{ color: "var(--text-2)" }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-3)";
                    (e.currentTarget as HTMLElement).style.color = "#ef4444";
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
                }}
            >
                <IconLogout />
                Log out
            </button>
        </div>
    );
}

export function DashboardHeader() {
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const name = session?.user?.name ?? "User";
    const email = session?.user?.email ?? "";
    const initial = name[0]?.toUpperCase() ?? "U";

    return (
        <header className="sticky top-2 z-30 h-12 flex items-center" style={{ background: "var(--bg)" }}>
            <div className="w-full max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
                {/* Brand */}
                <Link href="/dashboard" className="flex items-center gap-2.5 group">
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                            background: "linear-gradient(135deg, var(--accent), #f59e0b)",
                            boxShadow: "0 2px 8px var(--accent-glow)",
                        }}
                    >
                        <AppIcon />
                    </div>
                    <span className="font-semibold text-sm tracking-tight" style={{ color: "var(--text)" }}>
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
                </Link>

                {/* Right side — single clean avatar tile, click → popup (matches sidebar) */}
                <div className="relative">
                    <button
                        onClick={() => setOpen((v) => !v)}
                        title={name}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all"
                        style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                        }}
                    >
                        {initial}
                    </button>

                    {open && (
                        <ProfilePopup
                            name={name}
                            email={email}
                            onClose={() => setOpen(false)}
                            onLogout={() => {
                                setOpen(false);
                                signOut({ callbackUrl: "/login" });
                            }}
                        />
                    )}
                </div>
            </div>
        </header>
    );
}
