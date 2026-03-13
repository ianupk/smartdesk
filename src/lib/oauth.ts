import { prisma } from "@/lib/prisma";

export type Provider = "google" | "slack" | "zoom" | "github" | "todoist";

// ─── Google token refresh ─────────────────────────────────────────────────────
// Google access tokens expire in 1 hour. We refresh proactively using the
// stored refresh_token before every chat request.

export async function getGoogleToken(userId: string): Promise<string | null> {
    try {
        const integration = await prisma.integration.findUnique({
            where: { userId_provider: { userId, provider: "google" } },
        });
        if (!integration) return null;
        if (!integration.refreshToken) return integration.accessToken;

        const res = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: integration.refreshToken,
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            }),
        });

        if (!res.ok) {
            console.warn("[google] token refresh failed — using stored token");
            return integration.accessToken;
        }

        const data = (await res.json()) as Record<string, string>;
        if (!data.access_token) return integration.accessToken;

        await prisma.integration.update({
            where: { userId_provider: { userId, provider: "google" } },
            data: { accessToken: data.access_token },
        });
        return data.access_token;
    } catch (err) {
        console.error("[google] getGoogleToken error:", err);
        return null;
    }
}

// ─── Zoom token refresh ───────────────────────────────────────────────────────
export async function getZoomToken(userId: string): Promise<string | null> {
    try {
        const integration = await prisma.integration.findUnique({
            where: { userId_provider: { userId, provider: "zoom" } },
        });
        if (!integration) return null;
        if (!integration.refreshToken) return integration.accessToken;

        const creds = Buffer.from(
            `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`,
        ).toString("base64");

        const res = await fetch("https://zoom.us/oauth/token", {
            method: "POST",
            headers: {
                Authorization: `Basic ${creds}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: integration.refreshToken,
            }),
        });

        if (!res.ok) {
            console.warn("[zoom] token refresh failed — using stored token");
            return integration.accessToken;
        }

        const data = (await res.json()) as Record<string, string>;
        await prisma.integration.update({
            where: { userId_provider: { userId, provider: "zoom" } },
            data: {
                accessToken: data.access_token,
                refreshToken: data.refresh_token ?? integration.refreshToken,
            },
        });
        return data.access_token;
    } catch (err) {
        console.error("[zoom] getZoomToken error:", err);
        return null;
    }
}

// ─── Generic disconnect ───────────────────────────────────────────────────────
export async function disconnectIntegration(
    userId: string,
    provider: Provider,
) {
    await prisma.integration.deleteMany({ where: { userId, provider } });
}
