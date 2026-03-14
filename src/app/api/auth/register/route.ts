import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
    name: z.string().min(2).max(50),
    email: z.string().email(),
    password: z.string().min(8),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, password } = schema.parse(body);

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
        }

        const hashed = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: { name, email, password: hashed },
            select: { id: true, email: true, name: true },
        });

        return NextResponse.json({ user }, { status: 201 });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
        }
        console.error("[register]", err);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
}
