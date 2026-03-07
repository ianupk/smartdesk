import { MemorySaver } from "@langchain/langgraph";
import type { BaseCheckpointSaver } from "@langchain/langgraph";

let _checkpointer: BaseCheckpointSaver | null = null;

export async function getCheckpointer(): Promise<BaseCheckpointSaver> {
    if (_checkpointer) return _checkpointer;

    if (process.env.DATABASE_URL) {
        try {
            const { PostgresSaver } =
                await import("@langchain/langgraph-checkpoint-postgres");
            const { Pool } = await import("pg");
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                max: 10,
            });
            const saver = new PostgresSaver(pool);
            await saver.setup();
            console.log("[checkpointer] PostgresSaver ready");
            _checkpointer = saver;
        } catch {
            console.warn("[checkpointer] Falling back to MemorySaver");
            _checkpointer = new MemorySaver();
        }
    } else {
        _checkpointer = new MemorySaver();
    }

    return _checkpointer;
}
