import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Service · SmartDesk",
};

export default function TermsPage() {
    return (
        <div style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--text)" }}>
            {/* Nav */}
            <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid var(--border)" }}>
                <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #d97706, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg viewBox="0 0 16 16" fill="none" width="16" height="16" style={{ color: "#fff" }}>
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.25 5.25v5.5m7.5-7.5h-5.5m7.5 2v5.5m-2 2h-5.5m6.5-2h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm-9 0h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm0-9h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Zm9 0h1.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Z" />
                        </svg>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>SmartDesk</span>
                </Link>
                <Link href="/" style={{ fontSize: 13, color: "var(--text-3)", textDecoration: "none" }}>← Back</Link>
            </nav>

            {/* Content */}
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px" }}>
                <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>Legal</p>
                <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 8, color: "var(--text)" }}>Terms of Service</h1>
                <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 48 }}>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
                    {[
                        {
                            title: "1. Acceptance of Terms",
                            body: "By accessing or using SmartDesk, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the service.",
                        },
                        {
                            title: "2. Description of Service",
                            body: "SmartDesk is an AI productivity assistant that connects to third-party services (Google, Slack, GitHub, Zoom, Todoist) on your behalf. The service is provided as-is and is subject to change at any time.",
                        },
                        {
                            title: "3. Your Account",
                            body: "You are responsible for maintaining the security of your account and all activity that occurs under it. You must not share your credentials or allow others to access your account. Notify us immediately of any unauthorised access.",
                        },
                        {
                            title: "4. Acceptable Use",
                            body: "You agree not to use SmartDesk for any unlawful purpose, to attempt to gain unauthorised access to any system, to transmit harmful or malicious content, or to violate the terms of any third-party service you connect through SmartDesk.",
                        },
                        {
                            title: "5. Third-Party Services",
                            body: "SmartDesk acts as a client to third-party APIs. Your use of connected services (Google, Slack, etc.) is also governed by their respective terms of service. SmartDesk is not responsible for the availability, accuracy, or actions of those services.",
                        },
                        {
                            title: "6. Disclaimer of Warranties",
                            body: "SmartDesk is provided \"as is\" without warranties of any kind. We do not guarantee that the service will be uninterrupted, error-free, or that any AI-generated output will be accurate or suitable for your purposes. Always verify important information independently.",
                        },
                        {
                            title: "7. Limitation of Liability",
                            body: "To the maximum extent permitted by law, SmartDesk and its operators shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.",
                        },
                        {
                            title: "8. Termination",
                            body: "We reserve the right to suspend or terminate your access to SmartDesk at any time for violation of these terms. You may also delete your account at any time from the Dashboard.",
                        },
                        {
                            title: "9. Changes to Terms",
                            body: "We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.",
                        },
                        {
                            title: "10. Contact",
                            body: "Questions about these terms? Contact us at kanuoopk@gmail.com.",
                        },
                    ].map(({ title, body }) => (
                        <section key={title}>
                            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10, color: "var(--text)" }}>{title}</h2>
                            <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text-3)" }}>{body}</p>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
