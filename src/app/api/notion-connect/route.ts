/**
 * Notion Internal Integration Token Connect
 *
 * Notion's "Public" OAuth type is no longer easily available for new integrations.
 * The Internal Integration Token approach is simpler, equally powerful for a
 * single-user/single-workspace app, and is what Notion recommends for personal tools.
 *
 * Flow:
 *   POST /api/notion-connect  { action: "connect", token: "secret_xxx" }
 *     → validates token against Notion API
 *     → saves to Integration table
 *     → returns { success: true, workspaceName }
 *
 *   POST /api/notion-connect  { action: "disconnect" }
 *     → deletes Integration row
 *
 * Token format: starts with "secret_"
 * Get it from: notion.so/profile/integrations → your integration → Secrets tab
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, token } = body;

    if (action === "disconnect") {
        await prisma.integration.deleteMany({
            where: { userId: session.userId, provider: "notion" },
        });
        return NextResponse.json({ success: true });
    }

    if (action === "connect") {
        if (!token || typeof token !== "string") {
            return NextResponse.json(
                { error: "Token is required" },
                { status: 400 },
            );
        }

        const trimmed = token.trim();

        // Validate format
        if (!trimmed.startsWith("secret_") && !trimmed.startsWith("ntn_")) {
            return NextResponse.json(
                {
                    error: "Invalid token format. Notion internal tokens start with secret_ or ntn_",
                },
                { status: 400 },
            );
        }

        // Validate token against Notion API — fetch workspace info
        let workspaceName = "Notion Workspace";
        let workspaceId: string | null = null;

        try {
            const res = await fetch("https://api.notion.com/v1/users/me", {
                headers: {
                    Authorization: `Bearer ${trimmed}`,
                    "Notion-Version": "2022-06-28",
                },
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                const code = (errData as Record<string, unknown>).code as
                    | string
                    | undefined;

                if (res.status === 401 || code === "unauthorized") {
                    return NextResponse.json(
                        {
                            error: "Invalid token. Copy the correct Internal Integration Secret from the Secrets tab.",
                        },
                        { status: 400 },
                    );
                }

                return NextResponse.json(
                    {
                        error: `Notion API error (${res.status}). Check your token and try again.`,
                    },
                    { status: 400 },
                );
            }

            const me = (await res.json()) as Record<string, unknown>;

            // me.bot.workspace_name contains the workspace name for bot tokens
            const bot = me.bot as Record<string, unknown> | undefined;
            if (bot?.workspace_name) {
                workspaceName = bot.workspace_name as string;
            }
            if (bot?.workspace_id) {
                workspaceId = bot.workspace_id as string;
            }
        } catch (err) {
            console.error("[notion-connect] validation error:", err);
            return NextResponse.json(
                {
                    error: "Could not reach Notion API. Check your internet connection.",
                },
                { status: 500 },
            );
        }

        // Save to DB
        await prisma.integration.upsert({
            where: {
                userId_provider: { userId: session.userId, provider: "notion" },
            },
            create: {
                userId: session.userId,
                provider: "notion",
                accessToken: trimmed,
                teamId: workspaceId,
                teamName: workspaceName,
                metadata: JSON.stringify({
                    workspaceId,
                    workspaceName,
                    type: "internal",
                }),
            },
            update: {
                accessToken: trimmed,
                teamId: workspaceId,
                teamName: workspaceName,
                metadata: JSON.stringify({
                    workspaceId,
                    workspaceName,
                    type: "internal",
                }),
            },
        });

        console.log(
            "[notion-connect] Connected workspace:",
            workspaceName,
            "for user:",
            session.userId,
        );
        return NextResponse.json({ success: true, workspaceName });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
