"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import type { ChatThread } from "@/types";

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconNewChat = () => (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
);
const IconSidebarToggle = () => (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 3v18"/>
    </svg>
);
const IconDashboard = () => (
    <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
);
const IconLogout = () => (
    <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
    </svg>
);
const IconClose = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);
const IconMenu = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
);
// ⌘K as two clean keyboard badge spans — always visible, correct symbols
const IconCmdK = () => (
    <span className="flex items-center gap-0.5 select-none">
        <span className="inline-flex items-center justify-center rounded px-1 py-0.5 text-[10px] font-medium leading-none"
            style={{ background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text-3)", minWidth: 18 }}>
            ⌘
        </span>
        <span className="inline-flex items-center justify-center rounded px-1 py-0.5 text-[10px] font-medium leading-none"
            style={{ background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text-3)", minWidth: 18 }}>
            K
        </span>
    </span>
);

// ─── Shared icon button ───────────────────────────────────────────────────────
function SidebarIconBtn({ onClick, title, children, className }: {
    onClick?: () => void; title?: string; children: React.ReactNode; className?: string;
}) {
    return (
        <button onClick={onClick} title={title}
            className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--bg-3)]", className)}>
            {children}
        </button>
    );
}

// ─── Profile popup — fixed position to escape overflow-hidden sidebar ─────────
function ProfilePopup({ name, email, onClose, onLogout, anchorRect }: {
    name: string; email: string; onClose: () => void; onLogout: () => void;
    anchorRect: DOMRect | null;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [onClose]);

    if (!anchorRect) return null;

    // Position: just above the anchor button, left-aligned with it
    const top  = anchorRect.top - 8;   // 8px gap above anchor
    const left = anchorRect.left;
    const width = Math.max(anchorRect.width + 16, 220); // at least 220px wide

    return (
        <div ref={ref}
            style={{
                position: "fixed",
                top,
                left,
                width,
                transform: "translateY(-100%)",
                zIndex: 99999,
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                overflow: "hidden",
            }}>
            {/* User info header */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)" }}>
                    {name[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text)" }}>{name}</p>
                    <p className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>{email}</p>
                </div>
            </div>
            {/* Log out */}
            <button onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-all"
                style={{ color: "var(--text-2)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-3)"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "var(--text-2)"; }}>
                <IconLogout />
                Log out
            </button>
        </div>
    );
}

// ─── Thread list ──────────────────────────────────────────────────────────────
function ThreadList({ threads, loading, activeId, onNewChat, creating, onDelete, onClose }: {
    threads: ChatThread[]; loading: boolean; activeId: string;
    onNewChat: () => void; creating: boolean;
    onDelete: (e: React.MouseEvent, id: string) => void; onClose?: () => void;
}) {
    return (
        <div className="flex-1 overflow-y-auto py-1">
            {loading ? (
                <div className="flex items-center justify-center py-8"><Spinner className="w-4 h-4" /></div>
            ) : threads.length === 0 ? (
                <div className="text-center py-10 px-4">
                    <p className="text-xs mb-3" style={{ color: "var(--text-3)" }}>No conversations yet.</p>
                    <button onClick={onNewChat} disabled={creating}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                        style={{ background: "var(--bg-3)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
                        {creating ? "Creating…" : "+ New chat"}
                    </button>
                </div>
            ) : (
                <>
                    <p className="text-[0.6rem] font-semibold uppercase tracking-widest px-4 pb-1 pt-1" style={{ color: "var(--text-3)" }}>Chats</p>
                    {threads.map((t) => {
                        const isActive = t.id === activeId;
                        return (
                            <Link key={t.id} href={"/chat/" + t.id}
                                onClick={onClose}
                                className={cn(
                                    "group flex items-center justify-between gap-2 border-l-2 pl-4 pr-3 py-2 transition-all duration-100",
                                    isActive ? "border-[var(--accent)]" : "border-transparent hover:border-[var(--border)]"
                                )}
                                style={isActive ? { background: "var(--bg-3)", color: "var(--text)" } : { color: "var(--text-2)" }}
                                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; }}
                                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = ""; }}>
                                <span className="truncate text-[13px]">{t.title || "New conversation"}</span>
                                <button onClick={(e) => onDelete(e, t.id)}
                                    className="opacity-0 group-hover:opacity-100 shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all hover:text-red-400"
                                    style={{ color: "var(--text-3)" }} title="Delete">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                                    </svg>
                                </button>
                            </Link>
                        );
                    })}
                </>
            )}
        </div>
    );
}

// ─── Profile footer — avatar + full name row, click → fixed popup ─────────────
function ProfileFooter({ session, onClose, collapsed }: {
    session: ReturnType<typeof useSession>["data"]; onClose?: () => void; collapsed?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const name  = session?.user?.name  ?? "User";
    const email = session?.user?.email ?? "";
    const initial = name[0]?.toUpperCase() ?? "U";

    function toggle() {
        if (btnRef.current) setAnchorRect(btnRef.current.getBoundingClientRect());
        setOpen(v => !v);
    }

    // Collapsed view: just the avatar icon button
    if (collapsed) {
        return (
            <>
                <div className="shrink-0" style={{ borderTop: "1px solid var(--border)", paddingTop: "0.375rem" }}>
                    <button
                        ref={btnRef}
                        onClick={toggle}
                        className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                        style={{ color: "var(--text)" }}
                        title={name}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-3)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                        {/* Avatar tile */}
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)" }}>
                            {initial}
                        </div>
                    </button>
                </div>
                {open && (
                    <ProfilePopup
                        name={name}
                        email={email}
                        anchorRect={anchorRect}
                        onClose={() => setOpen(false)}
                        onLogout={() => { setOpen(false); onClose?.(); signOut({ callbackUrl: "/login" }); }}
                    />
                )}
            </>
        );
    }

    // Expanded view: full row with avatar + name + chevron
    return (
        <div className="shrink-0 px-3 py-2.5" style={{ borderTop: "1px solid var(--border)" }}>
            {/* Full-width row: avatar + name, whole row is clickable */}
            <button
                ref={btnRef}
                onClick={toggle}
                className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-all group"
                style={{ color: "var(--text)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-3)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                {/* Avatar tile */}
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                    style={{ background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)" }}>
                    {initial}
                </div>
                {/* Full name */}
                <span className="flex-1 text-left text-[13px] font-medium truncate" style={{ color: "var(--text)" }}>
                    {name}
                </span>
                {/* Chevron */}
                <svg className={cn("w-3.5 h-3.5 shrink-0 transition-transform duration-200", open && "rotate-180")}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-3)" }}>
                    <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </button>

            {open && (
                <ProfilePopup
                    name={name}
                    email={email}
                    anchorRect={anchorRect}
                    onClose={() => setOpen(false)}
                    onLogout={() => { setOpen(false); onClose?.(); signOut({ callbackUrl: "/login" }); }}
                />
            )}
        </div>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function ModernChatSidebar() {
    const [threads, setThreads]   = useState<ChatThread[]>([]);
    const [loading, setLoading]   = useState(true);
    const [creating, setCreating] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const params   = useParams();
    const pathname = usePathname();
    const router   = useRouter();
    const { data: session } = useSession();
    const activeId = params?.threadId as string;

    useEffect(() => { setMobileOpen(false); }, [activeId]);
    useEffect(() => {
        if (mobileOpen) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    const loadThreads = useCallback(async () => {
        try {
            const res = await fetch("/api/threads");
            if (!res.ok) throw new Error();
            setThreads(await res.json());
        } catch { /* silent */ } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        loadThreads();
        const iv = setInterval(loadThreads, 30_000);
        return () => clearInterval(iv);
    }, [loadThreads]);

    const createThread = async () => {
        setCreating(true); setMobileOpen(false);
        try {
            const res = await fetch("/api/threads", { method: "POST" });
            if (!res.ok) throw new Error();
            const thread = await res.json();
            setThreads(prev => [thread, ...prev]);
            router.push("/chat/" + thread.id);
        } catch { /* silent */ } finally { setCreating(false); }
    };

    const deleteThread = async (e: React.MouseEvent, id: string) => {
        e.preventDefault(); e.stopPropagation();
        try {
            await fetch("/api/threads/" + id, { method: "DELETE" });
            setThreads(prev => prev.filter(t => t.id !== id));
            if (activeId === id) router.push("/chat");
        } catch { /* silent */ }
    };

    const sharedListProps = { threads, loading, activeId, onNewChat: createThread, creating, onDelete: deleteThread };

    return (
        <>
            {/* ── MOBILE: top bar ── */}
            <div className="md:hidden flex items-center justify-between px-4 h-12 shrink-0"
                style={{ background: "var(--bg-1)", borderBottom: "1px solid var(--border)" }}>
                <Link href="/dashboard" className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>SmartDesk</span>
                </Link>
                <div className="flex items-center gap-1">
                    <SidebarIconBtn onClick={createThread} title="New chat" className={creating ? "opacity-50 pointer-events-none" : ""}>
                        {creating ? <Spinner className="w-4 h-4" /> : <IconNewChat />}
                    </SidebarIconBtn>
                    <SidebarIconBtn onClick={() => setMobileOpen(true)} title="Menu"><IconMenu /></SidebarIconBtn>
                </div>
            </div>

            {/* ── MOBILE: drawer ── */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                    <div className="relative flex flex-col w-[280px] max-w-[85vw] h-full z-10"
                        style={{ background: "var(--bg-1)", borderRight: "1px solid var(--border)" }}>
                        {/* Header row */}
                        <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
                            <span className="text-sm font-semibold px-2" style={{ color: "var(--text)" }}>Conversations</span>
                            <SidebarIconBtn onClick={() => setMobileOpen(false)} title="Close"><IconClose /></SidebarIconBtn>
                        </div>
                        {/* New Chat — ghost, icon + text + ⌘K icon */}
                        <div className="px-3 pb-2 shrink-0">
                            <button onClick={createThread} disabled={creating}
                                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all"
                                style={{ background: "var(--bg-3)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
                                {creating ? <Spinner className="w-4 h-4" /> : <IconNewChat />}
                                New Chat
                            </button>
                        </div>
                        {/* Dashboard — right below New Chat */}
                        <div className="px-3 pb-2 shrink-0">
                            <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all"
                                style={{ color: "var(--text-2)" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "var(--text-2)"; }}>
                                <IconDashboard />
                                <span>Dashboard</span>
                            </Link>
                        </div>
                        <ThreadList {...sharedListProps} onClose={() => setMobileOpen(false)} />
                        <ProfileFooter session={session} onClose={() => setMobileOpen(false)} />
                    </div>
                </div>
            )}

            {/* ── DESKTOP: sidebar ── */}
            <div className={cn("hidden md:flex flex-col shrink-0 h-full transition-all duration-300 ease-in-out overflow-hidden",
                    collapsed ? "w-14" : "w-[240px]")}
                style={{ background: "var(--bg-1)", borderRight: "1px solid var(--border)" }}>

                {collapsed ? (
                    /* ── Collapsed ── */
                    <div className="flex flex-col items-center h-full py-3 gap-1">
                        <SidebarIconBtn onClick={() => setCollapsed(false)} title="Expand sidebar">
                            <IconSidebarToggle />
                        </SidebarIconBtn>
                        <SidebarIconBtn onClick={createThread} title="New chat (⌘K)" className={creating ? "opacity-50 pointer-events-none" : ""}>
                            {creating ? <Spinner className="w-4 h-4" /> : <IconNewChat />}
                        </SidebarIconBtn>
                        {/* Dashboard icon below new-chat in collapsed view */}
                        <div className="w-6 my-1 shrink-0" style={{ borderTop: "1px solid var(--border)" }} />
                        <Link href="/dashboard" title="Dashboard">
                            <SidebarIconBtn title="Dashboard"><IconDashboard /></SidebarIconBtn>
                        </Link>
                        <div className="flex-1" />
                        {/* Profile avatar only */}
                        <ProfileFooter session={session} collapsed />
                    </div>
                ) : (
                    /* ── Expanded ── */
                    <div className="flex flex-col h-full">

                        {/* Row 1: sidebar-toggle  |  new-chat + ⌘K icon */}
                        <div className="flex items-center justify-between px-3 pt-3 pb-1 shrink-0">
                            <SidebarIconBtn onClick={() => setCollapsed(true)} title="Collapse sidebar">
                                <IconSidebarToggle />
                            </SidebarIconBtn>
                            {/* New Chat: ghost, no yellow, icon + label + ⌘K SVG icon */}
                            <button
                                onClick={createThread}
                                disabled={creating}
                                title="New chat (⌘K)"
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-all disabled:opacity-50"
                                style={{ color: "var(--text-3)", background: "transparent" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-3)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; }}>
                                {creating ? <Spinner className="w-[18px] h-[18px]" /> : <IconNewChat />}
                                <span></span>
                                {/* ⌘K as a proper visible icon — NOT invisible text */}
                                <IconCmdK />
                            </button>
                        </div>

                        {/* Row 2: Dashboard — directly below New Chat, above chat list */}
                        <div className="px-2 pb-1 shrink-0">
                            <Link href="/dashboard"
                                className={cn(
                                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all",
                                    pathname === "/dashboard"
                                        ? "text-[var(--text)] bg-[var(--bg-3)]"
                                        : "text-[var(--text-2)]"
                                )}
                                onMouseEnter={e => {
                                    if (pathname !== "/dashboard") {
                                        (e.currentTarget as HTMLElement).style.background = "var(--bg-2)";
                                        (e.currentTarget as HTMLElement).style.color = "var(--text)";
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (pathname !== "/dashboard") {
                                        (e.currentTarget as HTMLElement).style.background = "";
                                        (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
                                    }
                                }}>
                                <IconDashboard />
                                <span>Dashboard</span>
                            </Link>
                        </div>

                        {/* Chat list — fills remaining space */}
                        <ThreadList {...sharedListProps} />

                        {/* Profile footer — single avatar icon + popup */}
                        <ProfileFooter session={session} />
                    </div>
                )}
            </div>
        </>
    );
}
