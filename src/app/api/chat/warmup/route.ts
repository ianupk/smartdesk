import { NextResponse } from "next/server";
import { warmUpCheckpointer } from "@/lib/checkpointer";

export async function GET() {
    try {
        await warmUpCheckpointer();
        return NextResponse.json({ status: "ready" });
    } catch (err) {
        return NextResponse.json({ status: "degraded", error: (err as Error).message });
    }
}
