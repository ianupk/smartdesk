/**
 * Todoist OAuth 2.0 Integration
 *
 * Flow:
 *   1. GET /api/todoist-connect?action=connect  → redirect to Todoist OAuth consent
 *   2. Todoist redirects to /api/todoist-callback?code=...
 *   3. Callback exchanges code for per-user token, saves to Integration table
 *   4. Redirects to /dashboard?todoist_success=1
 *
 * Setup in app.todoist.com/app_console → Your App:
 *   Redirect URI: http://localhost:3000/api/todoist-callback   (dev — Todoist allows http!)
 *                 https://yourapp.vercel.app/api/todoist-callback  (prod)
 *
 * Scopes: data:read_write,data:delete,project:delete
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
        return NextResponse.redirect(new URL("/login", req.url));

    const action = new URL(req.url).searchParams.get("action");

    if (action === "connect") {
        const clientId = process.env.TODOIST_CLIENT_ID;
        if (!clientId) {
            return NextResponse.redirect(
                new URL("/dashboard?todoist_error=missing_config", req.url),
            );
        }

        // Encode userId + random nonce in state to prevent CSRF
        const state = Buffer.from(
            JSON.stringify({
                userId: session.userId,
                nonce:  randomBytes(8).toString("hex"),
            }),
        ).toString("base64url");

        const authUrl = new URL("https://todoist.com/oauth/authorize");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("scope", "data:read_write,data:delete,project:delete");
        authUrl.searchParams.set("state", state);

        return NextResponse.redirect(authUrl.toString());
    }

    if (action === "disconnect") {
        try {
            await prisma.integration.deleteMany({
                where: { userId: session.userId, provider: "todoist" },
            });
            return NextResponse.redirect(
                new URL("/dashboard?todoist_success=disconnected", req.url),
            );
        } catch (err) {
            console.error("[todoist-connect] disconnect error:", err);
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    }

    return NextResponse.redirect(new URL("/dashboard", req.url));
}
