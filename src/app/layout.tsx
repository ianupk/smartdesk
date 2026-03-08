import type { Metadata } from "next";
import "@/styles/globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
    title: { default: "SmartDesk", template: "%s · SmartDesk" },
    description:
        "AI productivity agent — Gmail, Calendar & Slack via LangGraph",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="h-full dark">
            <body className="h-full dark">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
