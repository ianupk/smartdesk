import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
        return NextResponse.redirect(
            new URL(
                `/dashboard?notion_error=${encodeURIComponent(error)}`,
                req.url,
            ),
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            new URL("/dashboard?notion_error=invalid_callback", req.url),
        );
    }

    let userId: string;
    try {
        const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
        userId = decoded.userId;
        if (!userId) throw new Error("No userId in state");
    } catch {
        return NextResponse.redirect(
            new URL("/dashboard?notion_error=invalid_state", req.url),
        );
    }

    try {
        const redirectUri = `${process.env.NEXTAUTH_URL}/api/notion-callback`;
        const creds = Buffer.from(
            `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`,
        ).toString("base64");

        const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
            method: "POST",
            headers: {
                Authorization: `Basic ${creds}`,
                "Content-Type": "application/json",
                "Notion-Version": "2022-06-28",
            },
            body: JSON.stringify({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
            }),
        });

        if (!tokenRes.ok) {
            const errText = await tokenRes.text();
            console.error("[notion-callback] Token exchange failed:", errText);
            return NextResponse.redirect(
                new URL(
                    "/dashboard?notion_error=token_exchange_failed",
                    req.url,
                ),
            );
        }

        const tokens = await tokenRes.json();

        const workspaceName = tokens.workspace_name ?? "Notion Workspace";
        const workspaceId = tokens.workspace_id ?? null;

        await prisma.integration.upsert({
            where: { userId_provider: { userId, provider: "notion" } },
            create: {
                userId,
                provider: "notion",
                accessToken: tokens.access_token,
                refreshToken: null,
                teamId: workspaceId,
                teamName: workspaceName,
                metadata: JSON.stringify({
                    workspaceId,
                    workspaceName,
                    botId: tokens.bot_id,
                    ownerType: tokens.owner?.type,
                }),
            },
            update: {
                accessToken: tokens.access_token,
                teamId: workspaceId,
                teamName: workspaceName,
                metadata: JSON.stringify({
                    workspaceId,
                    workspaceName,
                    botId: tokens.bot_id,
                    ownerType: tokens.owner?.type,
                }),
            },
        });

        console.log(
            "[notion-callback] Connected workspace:",
            workspaceName,
            "for user:",
            userId,
        );
        return NextResponse.redirect(
            new URL(
                `/dashboard?notion_success=1&workspace=${encodeURIComponent(workspaceName)}`,
                req.url,
            ),
        );
    } catch (err) {
        console.error("[notion-callback] error:", err);
        return NextResponse.redirect(
            new URL(
                `/dashboard?notion_error=${encodeURIComponent((err as Error).message)}`,
                req.url,
            ),
        );
    }
}
