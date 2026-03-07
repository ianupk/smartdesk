import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/threads/[threadId] — fetch messages for a thread
export async function GET(
    _req: NextRequest,
    { params }: { params: { threadId: string } },
) {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify thread belongs to user
    const thread = await prisma.thread.findFirst({
        where: { id: params.threadId, userId: session.userId },
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
export async function PATCH(
    req: NextRequest,
    { params }: { params: { threadId: string } },
) {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title } = await req.json();

    const thread = await prisma.thread.updateMany({
        where: { id: params.threadId, userId: session.userId },
        data: { title },
    });

    return NextResponse.json({ updated: thread.count > 0 });
}

// DELETE /api/threads/[threadId] — delete a thread
export async function DELETE(
    _req: NextRequest,
    { params }: { params: { threadId: string } },
) {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.thread.deleteMany({
        where: { id: params.threadId, userId: session.userId },
    });

    return NextResponse.json({ deleted: true });
}
