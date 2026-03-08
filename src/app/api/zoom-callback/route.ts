/**
 * Zoom OAuth callback — exchanges authorization code for tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
        console.error("[zoom-callback] OAuth error:", error);
        return NextResponse.redirect(
            new URL(
                `/dashboard?zoom_error=${encodeURIComponent(error)}`,
                req.url,
            ),
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            new URL("/dashboard?zoom_error=invalid_callback", req.url),
        );
    }

    let userId: string;
    try {
        const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
        userId = decoded.userId;
        if (!userId) throw new Error("No userId in state");
    } catch {
        return NextResponse.redirect(
            new URL("/dashboard?zoom_error=invalid_state", req.url),
        );
    }

    try {
        const redirectUri = `${process.env.NEXTAUTH_URL}/api/zoom-callback`;
        const creds = Buffer.from(
            `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`,
        ).toString("base64");

        const tokenRes = await fetch("https://zoom.us/oauth/token", {
            method: "POST",
            headers: {
                Authorization: `Basic ${creds}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
            }),
        });

        if (!tokenRes.ok) {
            const errText = await tokenRes.text();
            console.error("[zoom-callback] Token exchange failed:", errText);
            return NextResponse.redirect(
                new URL("/dashboard?zoom_error=token_exchange_failed", req.url),
            );
        }

        const tokens = await tokenRes.json();

        // Fetch Zoom user profile to get display name
        const profileRes = await fetch("https://api.zoom.us/v2/users/me", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const profile = profileRes.ok ? await profileRes.json() : {};

        const expiry = new Date(
            Date.now() + (tokens.expires_in ?? 3600) * 1000,
        );
        const displayName =
            profile.display_name || profile.first_name
                ? `${profile.first_name} ${profile.last_name}`.trim()
                : "Zoom Account";

        await prisma.integration.upsert({
            where: { userId_provider: { userId, provider: "zoom" } },
            create: {
                userId,
                provider: "zoom",
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token ?? null,
                scope: tokens.scope ?? null,
                tokenExpiry: expiry,
                teamName: displayName,
                metadata: JSON.stringify({
                    email: profile.email,
                    accountId: profile.account_id,
                }),
            },
            update: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token ?? null,
                scope: tokens.scope ?? null,
                tokenExpiry: expiry,
                teamName: displayName,
                metadata: JSON.stringify({
                    email: profile.email,
                    accountId: profile.account_id,
                }),
            },
        });

        console.log(
            "[zoom-callback] Connected for user:",
            userId,
            "name:",
            displayName,
        );
        return NextResponse.redirect(
            new URL(
                `/dashboard?zoom_success=1&name=${encodeURIComponent(displayName)}`,
                req.url,
            ),
        );
    } catch (err) {
        console.error("[zoom-callback] error:", err);
        return NextResponse.redirect(
            new URL(
                `/dashboard?zoom_error=${encodeURIComponent((err as Error).message)}`,
                req.url,
            ),
        );
    }
}
