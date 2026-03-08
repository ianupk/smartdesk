import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code  = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) return NextResponse.redirect(new URL(`/dashboard?github_error=${encodeURIComponent(error)}`, req.url));
    if (!code || !state) return NextResponse.redirect(new URL("/dashboard?github_error=invalid_callback", req.url));

    let userId: string;
    try {
        userId = JSON.parse(Buffer.from(state, "base64url").toString()).userId;
        if (!userId) throw new Error();
    } catch {
        return NextResponse.redirect(new URL("/dashboard?github_error=invalid_state", req.url));
    }

    try {
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: `${process.env.NEXTAUTH_URL}/api/github-callback`,
            }),
        });
        const tokens = await tokenRes.json() as Record<string, string>;
        if (tokens.error || !tokens.access_token) {
            console.error("[github-callback] token error:", tokens);
            return NextResponse.redirect(new URL("/dashboard?github_error=token_exchange_failed", req.url));
        }

        const profileRes = await fetch("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/vnd.github+json" },
        });
        const profile = await profileRes.json() as Record<string, unknown>;
        const username = (profile.login as string) ?? "GitHub User";
        const name     = (profile.name  as string) ?? username;

        await prisma.integration.upsert({
            where: { userId_provider: { userId, provider: "github" } },
            create: {
                userId, provider: "github",
                accessToken: tokens.access_token,
                teamName: name,
            },
            update: {
                accessToken: tokens.access_token,
                teamName: name,
            },
        });

        console.log("[github-callback] connected:", username, "for user:", userId);
        return NextResponse.redirect(new URL(`/dashboard?github_success=1&username=${encodeURIComponent(username)}`, req.url));
    } catch (err) {
        console.error("[github-callback] error:", err);
        return NextResponse.redirect(new URL(`/dashboard?github_error=${encodeURIComponent((err as Error).message)}`, req.url));
    }
}
