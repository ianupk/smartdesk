/**
 * This route is no longer used.
 * Notion integration now uses Internal Token approach (no OAuth redirect).
 * Token is submitted directly from the Dashboard UI via POST /api/notion-connect
 */
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
}
