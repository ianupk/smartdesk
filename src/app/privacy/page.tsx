import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy · SmartDesk",
};

export default function PrivacyPage() {
    return (
        <div style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--text)" }}>
            {/* Nav */}
            <nav
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "20px 40px",
                    borderBottom: "1px solid var(--border)",
                }}
            >
                <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                    <div
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: "linear-gradient(135deg, #d97706, #f59e0b)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <svg viewBox="0 0 16 16" fill="none" width="16" height="16" style={{ color: "#fff" }}>
                            <path
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.5"
                                d="M3.25 5.25v5.5m7.5-7.5h-5.5m7.5 2v5.5m-2 2h-5.5m6.5-2h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm-9 0h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm0-9h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm9 0h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Z"
                            />
                        </svg>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>SmartDesk</span>
                </Link>
                <Link href="/" style={{ fontSize: 13, color: "var(--text-3)", textDecoration: "none" }}>
                    ← Back
                </Link>
            </nav>

            {/* Content */}
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px" }}>
                <p
                    style={{
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--accent)",
                        marginBottom: 12,
                    }}
                >
                    Legal
                </p>
                <h1
                    style={{
                        fontSize: 32,
                        fontWeight: 700,
                        letterSpacing: "-0.03em",
                        marginBottom: 8,
                        color: "var(--text)",
                    }}
                >
                    Privacy Policy
                </h1>
                <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 48 }}>
                    Last updated:{" "}
                    {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
                    {[
                        {
                            title: "1. Information We Collect",
                            body: "SmartDesk collects only the information necessary to provide the service. This includes your email address and name when you register, OAuth tokens for third-party integrations you explicitly connect (Google, Slack, GitHub, Zoom, Todoist), and conversation history stored to maintain chat context across sessions.",
                        },
                        {
                            title: "2. How We Use Your Information",
                            body: "Your data is used solely to operate SmartDesk — to authenticate you, call third-party APIs on your behalf, and persist your conversation history. We do not sell, rent, or share your personal information with third parties for marketing purposes. We do not use your data to train AI models.",
                        },
                        {
                            title: "3. Third-Party Integrations",
                            body: "When you connect a service (e.g. Google, Slack), SmartDesk stores an OAuth access token to make API calls on your behalf. These tokens are encrypted at rest. You can disconnect any integration at any time from the Dashboard, which immediately deletes the stored token.",
                        },
                        {
                            title: "4. Data Storage & Security",
                            body: "Your data is stored in a PostgreSQL database hosted on infrastructure with encryption at rest and in transit. We use industry-standard security practices. No system is perfectly secure, but we take reasonable steps to protect your information.",
                        },
                        {
                            title: "5. Data Retention",
                            body: "Your account data and conversation history are retained as long as your account is active. You may request deletion of your account and all associated data at any time by contacting us.",
                        },
                        {
                            title: "6. Cookies",
                            body: "SmartDesk uses a single session cookie (next-auth.session-token) strictly for authentication. No tracking or advertising cookies are used.",
                        },
                        {
                            title: "7. Changes to This Policy",
                            body: "We may update this policy occasionally. We will notify you of significant changes by updating the date at the top of this page.",
                        },
                        {
                            title: "8. Contact",
                            body: "Questions about this policy? Contact us at kanuoopk@gmail.com.",
                        },
                    ].map(({ title, body }) => (
                        <section key={title}>
                            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10, color: "var(--text)" }}>
                                {title}
                            </h2>
                            <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text-3)" }}>{body}</p>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
