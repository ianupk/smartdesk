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
