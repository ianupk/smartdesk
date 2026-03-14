import type { Metadata } from "next";
import type { Viewport } from "next";
import "@/styles/globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
    title: { default: "SmartDesk", template: "%s · SmartDesk" },
    description: "AI productivity agent — Gmail, Calendar & Slack via LangGraph",
    verification: {
    google: "QNgZ6dd4D5gvZW88k7lMfIINhF6RPxHczTg0DWM7G70"
  }
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#0c0d11",
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
