/**
 * Zoom OAuth 2.0 Integration
 *
 * Flow:
 *   1. GET /api/zoom-connect?action=connect  → redirects to Zoom OAuth consent page
 *   2. Zoom redirects to /api/zoom-callback?code=...
 *   3. Callback exchanges code for tokens, saves to Integration table
 *   4. Redirects to /dashboard?zoom_success=1
 *
 * Zoom OAuth DOES support http://localhost redirect URIs (unlike Slack) ✓
 *
 * Setup:
 *   marketplace.zoom.us → Build App → OAuth
 *   Redirect URL: http://localhost:3000/api/zoom-callback
 *   Scopes: meeting:read, meeting:write, user:read
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "connect") {
        const clientId = process.env.ZOOM_CLIENT_ID;
        if (!clientId) {
            return NextResponse.redirect(new URL("/dashboard?zoom_error=missing_config", req.url));
        }

        // Store userId in state so we know who to save the token for after redirect
        const state = Buffer.from(JSON.stringify({ userId: session.userId })).toString("base64url");

        const redirectUri = `${process.env.NEXTAUTH_URL}/api/zoom-callback`;
        const authUrl = new URL("https://zoom.us/oauth/authorize");
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("state", state);

        return NextResponse.redirect(authUrl.toString());
    }

    if (action === "disconnect") {
        try {
            // Revoke token with Zoom before deleting (best-effort)
            const integration = await prisma.integration.findUnique({
                where: {
                    userId_provider: {
                        userId: session.userId,
                        provider: "zoom",
                    },
                },
            });
            if (integration?.accessToken) {
                await fetch(`https://zoom.us/oauth/revoke?token=${integration.accessToken}`, {
                    method: "POST",
                    headers: {
                        Authorization: `Basic ${Buffer.from(
                            `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`,
                        ).toString("base64")}`,
                    },
                }).catch(() => {}); // Best-effort
            }

            await prisma.integration.deleteMany({
                where: { userId: session.userId, provider: "zoom" },
            });

            return NextResponse.redirect(new URL("/dashboard?zoom_success=disconnected", req.url));
        } catch (err) {
            console.error("[zoom-connect] disconnect error:", err);
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    }

    return NextResponse.redirect(new URL("/dashboard", req.url));
}
