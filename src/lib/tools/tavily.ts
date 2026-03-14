/**
 * Tavily Web Search Tool for LangGraph
 *
 * No OAuth — just an API key in .env.local: TAVILY_API_KEY=tvly-...
 * Get a free key at: app.tavily.com (free tier = 1000 searches/month)
 *
 * Why Tavily over plain Google?
 *   - Purpose-built for AI agents — returns clean, structured results
 *   - Can return a direct AI-synthesised answer + sources
 *   - Supports "advanced" depth for more thorough research
 *   - Much better signal:noise than raw Google HTML scraping
 *
 * Tools:
 *   1. web_search        — general web search with optional AI answer
 *   2. search_news       — recent news search (last 3 days by default)
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getKey(): string {
    const key = process.env.TAVILY_API_KEY;
    if (!key)
        throw new Error("Web search is not configured. Add TAVILY_API_KEY to .env.local (free at app.tavily.com).");
    return key;
}

interface TavilyResult {
    title: string;
    url: string;
    content: string;
    score: number;
    published_date?: string;
}

interface TavilyResponse {
    answer?: string;
    results: TavilyResult[];
    query: string;
}

async function tavilySearch(params: {
    query: string;
    search_depth?: "basic" | "advanced";
    topic?: "general" | "news";
    days?: number;
    max_results?: number;
    include_answer?: boolean;
}): Promise<TavilyResponse> {
    const key = getKey();
    const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            api_key: key,
            include_answer: params.include_answer ?? true,
            include_raw_content: false,
            ...params,
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        if (res.status === 401) throw new Error("Invalid Tavily API key. Check TAVILY_API_KEY in .env.local.");
        if (res.status === 429) throw new Error("Tavily rate limit reached. Please wait and try again.");
        throw new Error(`Tavily API ${res.status}: ${errText}`);
    }

    return res.json() as Promise<TavilyResponse>;
}

// ── Tools ─────────────────────────────────────────────────────────────────────

export const webSearchTool = tool(
    async ({ query, depth, maxResults }: { query: string; depth?: string; maxResults?: number }) => {
        try {
            const data = await tavilySearch({
                query,
                search_depth: depth === "deep" ? "advanced" : "basic",
                topic: "general",
                max_results: maxResults ?? 5,
                include_answer: true,
            });

            return JSON.stringify({
                query: data.query,
                answer: data.answer ?? null,
                results: data.results.slice(0, maxResults ?? 5).map((r) => ({
                    title: r.title,
                    url: r.url,
                    summary: r.content.slice(0, 300),
                    score: Math.round(r.score * 100) / 100,
                })),
                total: data.results.length,
            });
        } catch (err) {
            console.error("[tavily:web_search]", err);
            return JSON.stringify({
                error: err instanceof Error ? err.message : String(err),
            });
        }
    },
    {
        name: "web_search",
        description:
            "Search the web for any current information, facts, or research. Use when user asks about recent events, news, facts you might not know, technical documentation, or anything requiring up-to-date information. Returns an AI-synthesised answer plus source links.",
        schema: z.object({
            query: z.string().describe("Search query — be specific for best results"),
            depth: z
                .enum(["basic", "deep"])
                .default("basic")
                .describe("Use 'deep' for thorough research, 'basic' for quick lookups"),
            maxResults: z.number().min(1).max(10).default(5).describe("Number of results to return"),
        }),
    },
);

export const searchNewsTool = tool(
    async ({ query, days, maxResults }: { query: string; days?: number; maxResults?: number }) => {
        try {
            const data = await tavilySearch({
                query,
                search_depth: "basic",
                topic: "news",
                days: days ?? 3,
                max_results: maxResults ?? 5,
                include_answer: true,
            });

            return JSON.stringify({
                query: data.query,
                answer: data.answer ?? null,
                articles: data.results.slice(0, maxResults ?? 5).map((r) => ({
                    title: r.title,
                    url: r.url,
                    summary: r.content.slice(0, 300),
                    publishedAt: r.published_date ?? null,
                })),
                total: data.results.length,
            });
        } catch (err) {
            console.error("[tavily:search_news]", err);
            return JSON.stringify({
                error: err instanceof Error ? err.message : String(err),
            });
        }
    },
    {
        name: "search_news",
        description:
            "Search for recent news articles on any topic. Use when user asks about current events, latest news, what happened recently, breaking news, or anything time-sensitive.",
        schema: z.object({
            query: z.string().describe("News search query"),
            days: z.number().min(1).max(30).default(3).describe("How many days back to search"),
            maxResults: z.number().min(1).max(10).default(5).describe("Number of articles to return"),
        }),
    },
);
