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
    const code = searchParams.get("code");

    if (!code && process.env.SLACK_BOT_TOKEN) {
        try {
            const testRes = await fetch("https://slack.com/api/auth.test", {
                headers: {
                    Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                },
            });
            const testData = await testRes.json();

            if (!testData.ok) {
                console.error(
                    "[slack-connect] Token test failed:",
                    testData.error,
                );
                return NextResponse.redirect(
                    new URL("/dashboard?error=slack_token_invalid", req.url),
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
                    accessToken: process.env.SLACK_BOT_TOKEN,
                    teamId: testData.team_id,
                    teamName: testData.team,
                },
                update: {
                    accessToken: process.env.SLACK_BOT_TOKEN,
                    teamId: testData.team_id,
                    teamName: testData.team,
                },
            });

            return NextResponse.redirect(
                new URL("/dashboard?connected=slack", req.url),
            );
        } catch (err) {
            console.error("[slack-connect] dev mode error:", err);
            return NextResponse.redirect(
                new URL("/dashboard?error=slack_failed", req.url),
            );
        }
    }

    if (!code) {
        if (!process.env.SLACK_CLIENT_ID) {
            return NextResponse.redirect(
                new URL("/dashboard?error=slack_not_configured", req.url),
            );
        }
        const slackAuthUrl = new URL("https://slack.com/oauth/v2/authorize");
        slackAuthUrl.searchParams.set("client_id", process.env.SLACK_CLIENT_ID);
        slackAuthUrl.searchParams.set(
            "scope",
            "chat:write,channels:read,channels:history,users:read",
        );
        slackAuthUrl.searchParams.set(
            "redirect_uri",
            `${process.env.NEXTAUTH_URL}/api/slack-connect`,
        );
        slackAuthUrl.searchParams.set("state", session.userId);
        return NextResponse.redirect(slackAuthUrl.toString());
    }

    const state = searchParams.get("state");
    if (state !== session.userId) {
        return NextResponse.redirect(
            new URL("/dashboard?error=slack_state", req.url),
        );
    }

    try {
        const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.SLACK_CLIENT_ID!,
                client_secret: process.env.SLACK_CLIENT_SECRET!,
                code,
                redirect_uri: `${process.env.NEXTAUTH_URL}/api/slack-connect`,
            }),
        });

        const data = await tokenRes.json();
        if (!data.ok) throw new Error(data.error);

        await prisma.integration.upsert({
            where: {
                userId_provider: { userId: session.userId, provider: "slack" },
            },
            create: {
                userId: session.userId,
                provider: "slack",
                accessToken: data.access_token,
                teamId: data.team?.id,
                teamName: data.team?.name,
            },
            update: {
                accessToken: data.access_token,
                teamId: data.team?.id,
                teamName: data.team?.name,
            },
        });

        return NextResponse.redirect(
            new URL("/dashboard?connected=slack", req.url),
        );
    } catch (err) {
        console.error("[slack-connect] OAuth error:", err);
        return NextResponse.redirect(
            new URL("/dashboard?error=slack_failed", req.url),
        );
    }
}
