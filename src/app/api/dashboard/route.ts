import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [totalThreads, totalMessages, integrations, recentThreads] =
        await Promise.all([
            prisma.thread.count({ where: { userId: session.userId } }),
            prisma.message.count({
                where: { thread: { userId: session.userId } },
            }),
            prisma.integration.findMany({
                where: { userId: session.userId },
                select: { provider: true, teamName: true, createdAt: true },
            }),
            prisma.thread.findMany({
                where: { userId: session.userId },
                orderBy: { updatedAt: "desc" },
                take: 5,
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
            }),
        ]);

    return NextResponse.json({
        totalThreads,
        totalMessages,
        integrations: integrations.map((i) => ({
            provider: i.provider,
            connected: true,
            teamName: i.teamName,
        })),
        recentThreads: recentThreads.map((t) => ({
            id: t.id,
            title: t.title,
            updatedAt: t.updatedAt,
            messageCount: t._count.messages,
            lastMessage: t.messages[0]?.content?.slice(0, 80),
        })),
    });
}
