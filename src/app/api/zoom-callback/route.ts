import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) return NextResponse.redirect(new URL(`/dashboard?zoom_error=${encodeURIComponent(error)}`, req.url));
    if (!code || !state) return NextResponse.redirect(new URL("/dashboard?zoom_error=invalid_callback", req.url));

    let userId: string;
    try {
        const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
        userId = decoded.userId;
        if (!userId) throw new Error("No userId");
    } catch {
        return NextResponse.redirect(new URL("/dashboard?zoom_error=invalid_state", req.url));
    }

    try {
        const redirectUri = `${process.env.NEXTAUTH_URL}/api/zoom-callback`;
        const creds = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString("base64");

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
            console.error("[zoom-callback] token exchange failed:", errText);
            return NextResponse.redirect(new URL("/dashboard?zoom_error=token_exchange_failed", req.url));
        }
        const tokens = (await tokenRes.json()) as Record<string, string>;

        const profileRes = await fetch("https://api.zoom.us/v2/users/me", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const profile = profileRes.ok ? ((await profileRes.json()) as Record<string, string>) : {};
        const displayName = profile.first_name
            ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
            : (profile.display_name ?? "Zoom Account");

        await prisma.integration.upsert({
            where: { userId_provider: { userId, provider: "zoom" } },
            create: {
                userId,
                provider: "zoom",
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token ?? null,
                scope: tokens.scope ?? null,
                teamName: displayName,
            },
            update: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token ?? null,
                scope: tokens.scope ?? null,
                teamName: displayName,
            },
        });

        console.log("[zoom-callback] connected:", displayName, "for user:", userId);
        return NextResponse.redirect(
            new URL(`/dashboard?zoom_success=1&name=${encodeURIComponent(displayName)}`, req.url),
        );
    } catch (err) {
        console.error("[zoom-callback] error:", err);
        return NextResponse.redirect(
            new URL(`/dashboard?zoom_error=${encodeURIComponent((err as Error).message)}`, req.url),
        );
    }
}
