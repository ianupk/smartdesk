import { PrismaClient } from "@prisma/client";

// Prevent multiple Prisma instances in Next.js dev (hot reload creates new modules)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: [], // disable all logging in dev — reduces noise and tiny perf gain
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });

// In dev, attach to globalThis so hot reload reuses the same instance
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
