import { MemorySaver } from "@langchain/langgraph";
import type { BaseCheckpointSaver } from "@langchain/langgraph";

let _checkpointer: BaseCheckpointSaver | null = null;
let _initPromise: Promise<BaseCheckpointSaver> | null = null;

export async function getCheckpointer(): Promise<BaseCheckpointSaver> {
    if (_checkpointer) return _checkpointer;

    // Deduplicate concurrent calls — only run setup once
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
        if (process.env.DATABASE_URL) {
            try {
                const { PostgresSaver } = await import("@langchain/langgraph-checkpoint-postgres");
                const { Pool } = await import("pg");
                const pool = new Pool({
                    connectionString: process.env.DATABASE_URL,
                    max: 5,
                    // Short connection timeout so we fall back to MemorySaver quickly if DB is down
                    connectionTimeoutMillis: 8000,
                    idleTimeoutMillis: 30000,
                });
                const saver = new PostgresSaver(pool);
                await saver.setup();
                console.log("[checkpointer] PostgresSaver ready");
                _checkpointer = saver;
            } catch (err) {
                console.warn("[checkpointer] Falling back to MemorySaver:", (err as Error).message);
                _checkpointer = new MemorySaver();
            }
        } else {
            console.log("[checkpointer] No DATABASE_URL — using MemorySaver");
            _checkpointer = new MemorySaver();
        }
        return _checkpointer;
    })();

    return _initPromise;
}

// Call this at server startup to pre-warm DB connection
// so the first user request doesn't pay the setup cost
export async function warmUpCheckpointer(): Promise<void> {
    await getCheckpointer();
}
