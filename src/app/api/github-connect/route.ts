/**
 * GitHub OAuth 2.0 Integration
 *
 * Flow:
 *   GET /api/github-connect?action=connect  → redirects to GitHub OAuth page
 *   GET /api/github-connect?action=disconnect → revokes token, deletes row
 *
 * GitHub OAuth supports http://localhost redirect URIs ✓
 *
 * Setup (2 min):
 *   github.com/settings/developers → OAuth Apps → New OAuth App
 *   Homepage URL:        http://localhost:3000
 *   Callback URL:        http://localhost:3000/api/github-callback
 *   .env.local:          GITHUB_CLIENT_ID=... GITHUB_CLIENT_SECRET=...
 *
 * Scopes requested: repo (read), user:email, read:org
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
        return NextResponse.redirect(new URL("/login", req.url));

    const action = new URL(req.url).searchParams.get("action");

    if (action === "connect") {
        if (!process.env.GITHUB_CLIENT_ID) {
            return NextResponse.redirect(
                new URL("/dashboard?github_error=missing_config", req.url),
            );
        }
        const state = Buffer.from(
            JSON.stringify({ userId: session.userId }),
        ).toString("base64url");
        const url = new URL("https://github.com/login/oauth/authorize");
        url.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID);
        url.searchParams.set(
            "redirect_uri",
            `${process.env.NEXTAUTH_URL}/api/github-callback`,
        );
        url.searchParams.set("scope", "repo read:user read:org");
        url.searchParams.set("state", state);
        return NextResponse.redirect(url.toString());
    }

    if (action === "disconnect") {
        try {
            const integration = await prisma.integration.findUnique({
                where: {
                    userId_provider: {
                        userId: session.userId,
                        provider: "github",
                    },
                },
            });
            // Best-effort token revocation
            if (
                integration?.accessToken &&
                process.env.GITHUB_CLIENT_ID &&
                process.env.GITHUB_CLIENT_SECRET
            ) {
                await fetch(
                    `https://api.github.com/applications/${process.env.GITHUB_CLIENT_ID}/token`,
                    {
                        method: "DELETE",
                        headers: {
                            Authorization: `Basic ${Buffer.from(`${process.env.GITHUB_CLIENT_ID}:${process.env.GITHUB_CLIENT_SECRET}`).toString("base64")}`,
                            Accept: "application/vnd.github+json",
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            access_token: integration.accessToken,
                        }),
                    },
                ).catch(() => {});
            }
            await prisma.integration.deleteMany({
                where: { userId: session.userId, provider: "github" },
            });
            return NextResponse.redirect(
                new URL("/dashboard?github_success=disconnected", req.url),
            );
        } catch (err) {
            console.error("[github-connect] disconnect:", err);
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    }

    return NextResponse.redirect(new URL("/dashboard", req.url));
}
