/**
 * Todoist OAuth Callback
 *
 * Todoist redirects here after user approves the app.
 * Exchanges the temporary code for a permanent access token,
 * saves it per-user in the Integration table.
 *
 * Note: Todoist OAuth tokens do NOT expire — no refresh token needed.
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
            new URL(`/dashboard?todoist_error=${encodeURIComponent(error)}`, req.url),
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            new URL("/dashboard?todoist_error=invalid_callback", req.url),
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
            new URL("/dashboard?todoist_error=invalid_state", req.url),
        );
    }

    try {
        // Exchange code for access token
        const tokenRes = await fetch("https://todoist.com/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id:     process.env.TODOIST_CLIENT_ID!,
                client_secret: process.env.TODOIST_CLIENT_SECRET!,
                code,
            }),
        });

        if (!tokenRes.ok) {
            const errText = await tokenRes.text();
            console.error("[todoist-callback] token exchange failed:", errText);
            return NextResponse.redirect(
                new URL("/dashboard?todoist_error=token_exchange_failed", req.url),
            );
        }

        const tokens = await tokenRes.json() as Record<string, string>;

        if (!tokens.access_token) {
            console.error("[todoist-callback] no access_token in response:", tokens);
            return NextResponse.redirect(
                new URL("/dashboard?todoist_error=no_token", req.url),
            );
        }

        // Fetch user profile to display their name in the dashboard
        let fullName = "Todoist User";
        try {
            const profileRes = await fetch("https://api.todoist.com/api/v1/user/info", {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
            });
            if (profileRes.ok) {
                const profile = await profileRes.json() as Record<string, unknown>;
                fullName =
                    (profile.full_name as string) ??
                    (profile.name as string) ??
                    "Todoist User";
            }
        } catch {
            // Profile fetch is best-effort — don't fail the whole flow
        }

        // Save per-user token to Integration table
        // Todoist tokens don't expire so no refreshToken needed
        await prisma.integration.upsert({
            where: { userId_provider: { userId, provider: "todoist" } },
            create: {
                userId,
                provider:    "todoist",
                accessToken: tokens.access_token,
                teamName:    fullName,
            },
            update: {
                accessToken: tokens.access_token,
                teamName:    fullName,
            },
        });

        console.log("[todoist-callback] connected:", fullName, "for user:", userId);

        return NextResponse.redirect(
            new URL(
                `/dashboard?todoist_success=1&name=${encodeURIComponent(fullName)}`,
                req.url,
            ),
        );
    } catch (err) {
        console.error("[todoist-callback] error:", err);
        return NextResponse.redirect(
            new URL(
                `/dashboard?todoist_error=${encodeURIComponent((err as Error).message)}`,
                req.url,
            ),
        );
    }
}
