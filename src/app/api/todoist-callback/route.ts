/**
 * No longer used — Todoist integration now uses Personal API Token approach.
 * Token is submitted directly from the Dashboard UI via POST /api/todoist-connect
 */
import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
}
