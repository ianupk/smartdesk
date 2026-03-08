import { prisma } from "@/lib/prisma";

export type Provider = "google" | "slack" | "zoom" | "github" | "todoist";

// ─── Zoom token refresh ───────────────────────────────────────────────────────
// tokenExpiry is not in the schema, so we always try the stored token.
// If Zoom returns 401, the user can reconnect from the dashboard.

export async function getZoomToken(userId: string): Promise<string | null> {
    try {
        const integration = await prisma.integration.findUnique({
            where: { userId_provider: { userId, provider: "zoom" } },
        });
        if (!integration) return null;

        // If no refresh token, just return what we have
        if (!integration.refreshToken) return integration.accessToken;

        // Attempt a proactive refresh so sessions don't silently expire
        const creds = Buffer.from(
            `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
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

        const data = await res.json() as Record<string, string>;
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

export async function disconnectIntegration(userId: string, provider: Provider) {
    await prisma.integration.deleteMany({ where: { userId, provider } });
}
