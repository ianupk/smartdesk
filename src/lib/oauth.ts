/**
 * OAuth helpers shared across all integrations.
 *
 * Token refresh strategy:
 *   - Zoom tokens expire in 1 hour — we refresh automatically if tokenExpiry < now + 5min
 *   - Notion tokens don't expire (they're persistent until revoked) — no refresh needed
 *   - Google tokens are handled by the NextAuth Google provider separately
 *
 * How auth works for each provider:
 *   Zoom  → Standard OAuth 2.0, works on localhost http://
 *   Notion → Standard OAuth 2.0, works on localhost http://
 *   Slack  → Bot token (not OAuth) because Slack blocks http:// redirect URIs
 *   Google → Handled by NextAuth signIn("google")
 */

import { prisma } from "@/lib/prisma";

export type Provider = "google" | "slack" | "zoom" | "notion";

export async function refreshZoomToken(userId: string): Promise<string | null> {
    try {
        const integration = await prisma.integration.findUnique({
            where: { userId_provider: { userId, provider: "zoom" } },
        });
        if (!integration) return null;

        if (
            integration.tokenExpiry &&
            integration.tokenExpiry > new Date(Date.now() + 5 * 60 * 1000)
        ) {
            return integration.accessToken;
        }

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
            console.error("[zoom] Token refresh failed:", await res.text());
            return integration.accessToken;
        }

        const data = await res.json();
        const expiry = new Date(Date.now() + data.expires_in * 1000);

        await prisma.integration.update({
            where: { userId_provider: { userId, provider: "zoom" } },
            data: {
                accessToken: data.access_token,
                refreshToken: data.refresh_token ?? integration.refreshToken,
                tokenExpiry: expiry,
            },
        });

        return data.access_token;
    } catch (err) {
        console.error("[zoom] refreshZoomToken error:", err);
        return null;
    }
}

export async function disconnectIntegration(
    userId: string,
    provider: Provider,
) {
    await prisma.integration.deleteMany({
        where: { userId, provider },
    });
}
