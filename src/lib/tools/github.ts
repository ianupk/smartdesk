import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { RunnableConfig } from "@langchain/core/runnables";

function getToken(config?: RunnableConfig): string {
    const token = config?.configurable?.githubAccessToken as string | undefined;
    if (!token)
        throw new Error(
            "GitHub is not connected. Go to Dashboard → Connect GitHub.",
        );
    return token;
}

function githubError(toolName: string, err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    const map: Record<string, string> = {
        "Bad credentials":
            "GitHub token is invalid or expired. Please reconnect from Dashboard.",
        "Not Found":
            "Repository or resource not found. Check the repo name (owner/repo format).",
        "rate limit":
            "GitHub API rate limit reached. Please wait a minute and try again.",
    };
    for (const [k, v] of Object.entries(map)) {
        if (msg.includes(k)) return JSON.stringify({ error: v });
    }
    console.error(`[github:${toolName}]`, msg);
    return JSON.stringify({ error: msg });
}

async function ghFetch(
    path: string,
    token: string,
    opts: RequestInit = {},
): Promise<Response> {
    return fetch(`https://api.github.com${path}`, {
        ...opts,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            ...(opts.headers ?? {}),
        },
    });
}

// ── list_github_repos ─────────────────────────────────────────────────────────
// Only one GitHub tool kept — enough to demo GitHub integration without
// overwhelming the free-tier LLM with too many tool choices.

export const listReposTool = tool(
    async (
        { visibility, sort }: { visibility?: string; sort?: string },
        config?: RunnableConfig,
    ) => {
        try {
            const token = getToken(config);
            const params = new URLSearchParams({
                per_page: "20",
                sort: sort ?? "updated",
                visibility: visibility ?? "all",
            });
            const res = await ghFetch(`/user/repos?${params}`, token);
            if (!res.ok)
                throw new Error(
                    `GitHub API ${res.status}: ${await res.text()}`,
                );
            const repos = (await res.json()) as Record<string, unknown>[];
            return JSON.stringify({
                repos: repos.map((r) => ({
                    fullName: r.full_name,
                    description: r.description ?? "",
                    language: r.language ?? "",
                    stars: r.stargazers_count,
                    openIssues: r.open_issues_count,
                    updatedAt: r.updated_at,
                    private: r.private,
                    defaultBranch: r.default_branch,
                })),
                total: repos.length,
            });
        } catch (err) {
            return githubError("list_repos", err);
        }
    },
    {
        name: "list_github_repos",
        description:
            "List your GitHub repositories with language, stars, and open issues. Use when user asks about their repos or projects.",
        schema: z.object({
            visibility: z
                .enum(["all", "public", "private"])
                .default("all")
                .describe("Filter by repo visibility"),
            sort: z
                .enum(["updated", "created", "pushed", "full_name"])
                .default("updated")
                .describe("Sort order"),
        }),
    },
);
