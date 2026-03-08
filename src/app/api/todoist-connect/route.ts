/**
 * Todoist Personal API Token Integration
 *
 * Like Notion, Todoist's OAuth setup is complex and error-prone for local dev.
 * The Personal API Token approach is simpler, equally powerful for a single-user app,
 * and is what Todoist themselves recommend for personal tools.
 *
 * Token location: todoist.com/app/settings/integrations/developer → API token
 * Token format: 40-character hex string
 *
 * Flow:
 *   POST { action: "connect", token: "abc123..." } → validate → save to DB
 *   POST { action: "disconnect" }                  → delete from DB
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
            where: { userId: session.userId, provider: "todoist" },
        });
        return NextResponse.json({ success: true });
    }

    if (action === "connect") {
        if (!token || typeof token !== "string" || !token.trim()) {
            return NextResponse.json(
                { error: "Token is required." },
                { status: 400 },
            );
        }

        const trimmed = token.trim();

        // Validate token using the new API v1 — fetch user info
        // NOTE: /rest/v2/user is deprecated (410). New endpoint is /api/v1/user/info
        let fullName = "Todoist User";
        let email = "";

        try {
            const res = await fetch(
                "https://api.todoist.com/api/v1/user/info",
                {
                    headers: { Authorization: `Bearer ${trimmed}` },
                },
            );

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    return NextResponse.json(
                        {
                            error: "Invalid token. Copy the API token from Todoist → Settings → Integrations → Developer.",
                        },
                        { status: 400 },
                    );
                }
                // Fallback: try listing projects as a secondary validation
                const fallback = await fetch(
                    "https://api.todoist.com/api/v1/projects",
                    {
                        headers: { Authorization: `Bearer ${trimmed}` },
                    },
                );
                if (!fallback.ok) {
                    return NextResponse.json(
                        {
                            error: `Token validation failed (${fallback.status}). Make sure you copied the correct API token.`,
                        },
                        { status: 400 },
                    );
                }
                // Token works — just couldn't get user info, proceed with defaults
            } else {
                const profile = (await res.json()) as Record<string, unknown>;
                fullName =
                    (profile.full_name as string) ??
                    (profile.name as string) ??
                    "Todoist User";
                email = (profile.email as string) ?? "";
            }
        } catch (err) {
            console.error("[todoist-connect] validation error:", err);
            return NextResponse.json(
                {
                    error: "Could not reach Todoist API. Check your internet connection.",
                },
                { status: 500 },
            );
        }

        // Save to DB
        await prisma.integration.upsert({
            where: {
                userId_provider: {
                    userId: session.userId,
                    provider: "todoist",
                },
            },
            create: {
                userId: session.userId,
                provider: "todoist",
                accessToken: trimmed,
                teamName: fullName,
                metadata: JSON.stringify({ email, type: "personal_token" }),
            },
            update: {
                accessToken: trimmed,
                teamName: fullName,
                metadata: JSON.stringify({ email, type: "personal_token" }),
            },
        });

        console.log(
            "[todoist-connect] Connected:",
            fullName,
            "for user:",
            session.userId,
        );
        return NextResponse.json({ success: true, fullName, email });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
