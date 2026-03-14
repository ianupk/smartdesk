/**
 * Slack OAuth 2.0 Integration
 *
 * Flow:
 *   1. GET /api/slack-connect?action=connect    → redirect to Slack OAuth consent
 *   2. Slack redirects to /api/slack-callback?code=...
 *   3. Callback exchanges code for per-user token, saves to Integration table
 *   4. Redirects to /dashboard?slack_success=1
 *
 * Setup in api.slack.com/apps → OAuth & Permissions:
 *   Redirect URLs: https://<your-cloudflare>.trycloudflare.com/api/slack-callback  (dev)
 *                  https://yourapp.vercel.app/api/slack-callback                   (prod)
 *
 * Bot Token Scopes needed:
 *   channels:read, channels:history, chat:write, users:read
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.userId) return NextResponse.redirect(new URL("/login", req.url));

    const action = new URL(req.url).searchParams.get("action");

    if (action === "connect") {
        const clientId = process.env.SLACK_CLIENT_ID;
        if (!clientId) {
            return NextResponse.redirect(new URL("/dashboard?slack_error=missing_config", req.url));
        }

        // Encode userId in state so callback knows which user to save token for
        const state = Buffer.from(JSON.stringify({ userId: session.userId })).toString("base64url");

        const redirectUri = `${process.env.NEXTAUTH_URL}/api/slack-callback`;

        const authUrl = new URL("https://slack.com/oauth/v2/authorize");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("state", state);
        // Bot Token Scopes — must exactly match what's configured in api.slack.com/apps
        authUrl.searchParams.set("scope", "channels:read,channels:history,chat:write,users:read");

        return NextResponse.redirect(authUrl.toString());
    }

    if (action === "disconnect") {
        try {
            await prisma.integration.deleteMany({
                where: { userId: session.userId, provider: "slack" },
            });
            return NextResponse.redirect(new URL("/dashboard?slack_success=disconnected", req.url));
        } catch (err) {
            console.error("[slack-connect] disconnect error:", err);
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    }

    return NextResponse.redirect(new URL("/dashboard", req.url));
}
