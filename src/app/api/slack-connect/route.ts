/**
 * Slack Integration Handler
 *
 * Architecture decision: Bot Token approach (not OAuth)
 *
 * WHY NOT OAuth for localhost:
 *   - Slack OAuth requires HTTPS redirect URIs
 *   - localhost is HTTP → Slack rejects it completely
 *   - Even ngrok works but adds setup friction
 *
 * HOW THIS WORKS:
 *   1. User creates a Slack App and gets a Bot Token (xoxb-...)
 *   2. They add SLACK_BOT_TOKEN to .env.local
 *   3. Click "Connect Slack" → this route validates the token via auth.test
 *   4. Token is saved to Integration table tied to the user
 *   5. Session callback reads it → attaches to every request
 *   6. Slack tools receive it via LangGraph config.configurable
 *
 * For production with real OAuth, see the /api/slack-oauth route (separate file).
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
        const token = process.env.SLACK_BOT_TOKEN;

        if (!token) {
            return NextResponse.redirect(
                new URL("/dashboard?slack_error=missing_token", req.url),
            );
        }

        if (!token.startsWith("xoxb-") && !token.startsWith("xoxp-")) {
            return NextResponse.redirect(
                new URL("/dashboard?slack_error=invalid_token_format", req.url),
            );
        }

        try {
            // Validate token against Slack API
            const testRes = await fetch("https://slack.com/api/auth.test", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!testRes.ok) {
                throw new Error(`HTTP ${testRes.status} from Slack API`);
            }

            const testData = await testRes.json();

            if (!testData.ok) {
                const errCode = testData.error ?? "unknown_error";
                return NextResponse.redirect(
                    new URL(
                        `/dashboard?slack_error=${encodeURIComponent(errCode)}`,
                        req.url,
                    ),
                );
            }

            // Save token to Integration table — session callback will pick it up
            await prisma.integration.upsert({
                where: {
                    userId_provider: {
                        userId: session.userId,
                        provider: "slack",
                    },
                },
                create: {
                    userId: session.userId,
                    provider: "slack",
                    accessToken: token,
                    teamId: testData.team_id ?? null,
                    teamName: testData.team ?? "Slack Workspace",
                },
                update: {
                    accessToken: token,
                    teamId: testData.team_id ?? null,
                    teamName: testData.team ?? "Slack Workspace",
                },
            });

            console.log(
                "[slack-connect] Saved token for workspace:",
                testData.team,
            );

            return NextResponse.redirect(
                new URL(
                    `/dashboard?slack_success=1&team=${encodeURIComponent(testData.team ?? "Slack")}`,
                    req.url,
                ),
            );
        } catch (err) {
            console.error("[slack-connect] Error:", err);
            return NextResponse.redirect(
                new URL(
                    `/dashboard?slack_error=${encodeURIComponent((err as Error).message)}`,
                    req.url,
                ),
            );
        }
    }

    if (action === "disconnect") {
        try {
            await prisma.integration.deleteMany({
                where: { userId: session.userId, provider: "slack" },
            });
            return NextResponse.redirect(
                new URL("/dashboard?slack_success=disconnected", req.url),
            );
        } catch (err) {
            console.error("[slack-connect] Disconnect error:", err);
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    }

    return NextResponse.redirect(new URL("/dashboard", req.url));
}
