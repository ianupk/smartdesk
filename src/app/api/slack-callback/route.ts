/**
 * Slack OAuth Callback
 *
 * Slack redirects here after the user approves the app.
 * Exchanges the temporary code for a bot access token,
 * saves it per-user in the Integration table.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code  = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // User denied access
    if (error) {
        return NextResponse.redirect(
            new URL(`/dashboard?slack_error=${encodeURIComponent(error)}`, req.url),
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            new URL("/dashboard?slack_error=invalid_callback", req.url),
        );
    }

    // Decode userId from state
    let userId: string;
    try {
        const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
        userId = decoded.userId;
        if (!userId) throw new Error("No userId in state");
    } catch {
        return NextResponse.redirect(
            new URL("/dashboard?slack_error=invalid_state", req.url),
        );
    }

    try {
        const redirectUri = `${process.env.NEXTAUTH_URL}/api/slack-callback`;

        // Exchange code for access token
        const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id:     process.env.SLACK_CLIENT_ID!,
                client_secret: process.env.SLACK_CLIENT_SECRET!,
                code,
                redirect_uri: redirectUri,
            }),
        });

        const tokens = await tokenRes.json() as Record<string, unknown>;

        if (!tokens.ok) {
            console.error("[slack-callback] token exchange failed:", tokens.error);
            return NextResponse.redirect(
                new URL(
                    `/dashboard?slack_error=${encodeURIComponent(String(tokens.error ?? "token_exchange_failed"))}`,
                    req.url,
                ),
            );
        }

        // tokens.access_token = bot token (xoxb-)
        // tokens.authed_user.access_token = user token (xoxp-) — for user-scoped APIs
        const botToken   = tokens.access_token as string;
        const teamName   = (tokens.team as Record<string, string>)?.name ?? "Slack Workspace";
        const teamId     = (tokens.team as Record<string, string>)?.id ?? null;

        // Save bot token per-user — this is what the Slack tools use
        await prisma.integration.upsert({
            where: { userId_provider: { userId, provider: "slack" } },
            create: {
                userId,
                provider:    "slack",
                accessToken: botToken,
                teamId,
                teamName,
            },
            update: {
                accessToken: botToken,
                teamId,
                teamName,
            },
        });

        console.log("[slack-callback] connected:", teamName, "for user:", userId);

        return NextResponse.redirect(
            new URL(
                `/dashboard?slack_success=1&team=${encodeURIComponent(teamName)}`,
                req.url,
            ),
        );
    } catch (err) {
        console.error("[slack-callback] error:", err);
        return NextResponse.redirect(
            new URL(
                `/dashboard?slack_error=${encodeURIComponent((err as Error).message)}`,
                req.url,
            ),
        );
    }
}
