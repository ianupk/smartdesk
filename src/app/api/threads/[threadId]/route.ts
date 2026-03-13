import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Next.js 15: params is a Promise — must be awaited before accessing properties
type RouteParams = { params: Promise<{ threadId: string }> };

// GET /api/threads/[threadId] — fetch messages for a thread
export async function GET(_req: NextRequest, { params }: RouteParams) {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { threadId } = await params;

    const thread = await prisma.thread.findFirst({
        where: { id: threadId, userId: session.userId },
        include: {
            messages: {
                orderBy: { createdAt: "asc" },
            },
        },
    });

    if (!thread)
        return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ thread });
}

// PATCH /api/threads/[threadId] — update thread title
export async function PATCH(req: NextRequest, { params }: RouteParams) {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { threadId } = await params;
    const { title } = await req.json();

    const thread = await prisma.thread.updateMany({
        where: { id: threadId, userId: session.userId },
        data: { title },
    });

    return NextResponse.json({ updated: thread.count > 0 });
}

// DELETE /api/threads/[threadId] — delete a thread
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { threadId } = await params;

    await prisma.thread.deleteMany({
        where: { id: threadId, userId: session.userId },
    });

    return NextResponse.json({ deleted: true });
}
