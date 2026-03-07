import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/threads — list all threads for current user
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const threads = await prisma.thread.findMany({
        where: { userId: session.userId },
        orderBy: { updatedAt: "desc" },
        select: {
            id: true,
            title: true,
            updatedAt: true,
            _count: { select: { messages: true } },
            messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { content: true },
            },
        },
    });

    return NextResponse.json(
        threads.map((t) => ({
            id: t.id,
            title: t.title,
            updatedAt: t.updatedAt,
            messageCount: t._count.messages,
            lastMessage: t.messages[0]?.content?.slice(0, 80),
        })),
    );
}

// POST /api/threads — create a new thread
export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const thread = await prisma.thread.create({
        data: {
            userId: session.userId,
            title: "New conversation",
        },
        select: { id: true, title: true, updatedAt: true },
    });

    return NextResponse.json(thread, { status: 201 });
}
