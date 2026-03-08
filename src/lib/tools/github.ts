/**
 * GitHub Tools for LangGraph
 *
 * Token: config.configurable.githubAccessToken (no expiry, no refresh needed)
 *
 * Most common developer workflow use cases:
 *   1. list_github_repos       — see your repos at a glance
 *   2. list_github_prs         — PRs waiting for your review or created by you
 *   3. list_github_issues      — open issues assigned to you or in a repo
 *   4. get_github_pr           — full PR details + diff summary
 *   5. create_github_issue     — create a bug/task from chat
 *   6. search_github_code      — search across repos
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { RunnableConfig } from "@langchain/core/runnables";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getToken(config?: RunnableConfig): string {
  const token = config?.configurable?.githubAccessToken as string | undefined;
  if (!token) throw new Error("GitHub is not connected. Go to Dashboard → Connect GitHub.");
  return token;
}

function githubError(toolName: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const map: Record<string, string> = {
    "Bad credentials": "GitHub token is invalid or expired. Please reconnect from the Dashboard.",
    "Not Found": "Repository or resource not found. Check the repo name (owner/repo format).",
    "rate limit": "GitHub API rate limit reached. Please wait a minute and try again.",
  };
  for (const [k, v] of Object.entries(map)) {
    if (msg.includes(k)) return JSON.stringify({ error: v });
  }
  console.error(`[github:${toolName}]`, err);
  return JSON.stringify({ error: msg });
}

async function ghFetch(path: string, token: string, opts: RequestInit = {}): Promise<Response> {
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

// ── Tools ─────────────────────────────────────────────────────────────────────

export const listReposTool = tool(
  async ({ visibility, sort }: { visibility?: string; sort?: string }, config?: RunnableConfig) => {
    try {
      const token = getToken(config);
      const params = new URLSearchParams({
        per_page: "20",
        sort: sort ?? "updated",
        visibility: visibility ?? "all",
      });
      const res = await ghFetch(`/user/repos?${params}`, token);
      if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
      const repos = await res.json() as Record<string, unknown>[];

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
    description: "List your GitHub repositories. Use when user asks about their repos, projects, or codebases.",
    schema: z.object({
      visibility: z.enum(["all", "public", "private"]).default("all").describe("Filter by visibility"),
      sort: z.enum(["updated", "created", "pushed", "full_name"]).default("updated").describe("Sort order"),
    }),
  }
);

export const listPRsTool = tool(
  async ({ repo, state, role }: { repo?: string; state?: string; role?: string }, config?: RunnableConfig) => {
    try {
      const token = getToken(config);

      // If no repo specified, search across all PRs involving the user
      if (!repo) {
        const qualifier = role === "author" ? "author:@me" : "review-requested:@me";
        const q = `is:pr is:${state ?? "open"} ${qualifier}`;
        const res = await ghFetch(`/search/issues?q=${encodeURIComponent(q)}&per_page=15&sort=updated`, token);
        if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
        const data = await res.json() as Record<string, unknown>;
        const items = (data.items as Record<string, unknown>[]) ?? [];
        return JSON.stringify({
          pullRequests: items.map((pr) => ({
            number: pr.number,
            title: pr.title,
            repo: (pr.repository_url as string)?.split("/").slice(-2).join("/"),
            author: (pr.user as Record<string, unknown>)?.login,
            state: pr.state,
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            url: pr.html_url,
            labels: ((pr.labels as Record<string, unknown>[]) ?? []).map((l) => l.name),
          })),
          total: data.total_count,
        });
      }

      // Specific repo PRs
      const params = new URLSearchParams({ state: state ?? "open", per_page: "20", sort: "updated" });
      const res = await ghFetch(`/repos/${repo}/pulls?${params}`, token);
      if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
      const prs = await res.json() as Record<string, unknown>[];
      return JSON.stringify({
        pullRequests: prs.map((pr) => ({
          number: pr.number,
          title: pr.title,
          author: (pr.user as Record<string, unknown>)?.login,
          state: pr.state,
          draft: pr.draft,
          reviewers: ((pr.requested_reviewers as Record<string, unknown>[]) ?? []).map((r) => r.login),
          createdAt: pr.created_at,
          url: pr.html_url,
        })),
        total: prs.length,
      });
    } catch (err) {
      return githubError("list_prs", err);
    }
  },
  {
    name: "list_github_prs",
    description: "List GitHub pull requests — either across all repos (use role='review-requested' to find PRs needing your review) or for a specific repo. Use when user asks about PRs, reviews, or code changes.",
    schema: z.object({
      repo: z.string().optional().describe("Repository in owner/repo format. Omit to search across all repos."),
      state: z.enum(["open", "closed", "all"]).default("open"),
      role: z.enum(["author", "review-requested"]).default("review-requested").describe("Filter by your role — use review-requested to find PRs awaiting your review"),
    }),
  }
);

export const listIssuesTool = tool(
  async ({ repo, state, assignee }: { repo?: string; state?: string; assignee?: string }, config?: RunnableConfig) => {
    try {
      const token = getToken(config);

      if (!repo) {
        const q = `is:issue is:${state ?? "open"} assignee:${assignee ?? "@me"}`;
        const res = await ghFetch(`/search/issues?q=${encodeURIComponent(q)}&per_page=20&sort=updated`, token);
        if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
        const data = await res.json() as Record<string, unknown>;
        const items = (data.items as Record<string, unknown>[]) ?? [];
        return JSON.stringify({
          issues: items.map((i) => ({
            number: i.number,
            title: i.title,
            repo: (i.repository_url as string)?.split("/").slice(-2).join("/"),
            author: (i.user as Record<string, unknown>)?.login,
            state: i.state,
            labels: ((i.labels as Record<string, unknown>[]) ?? []).map((l) => l.name),
            createdAt: i.created_at,
            url: i.html_url,
          })),
          total: data.total_count,
        });
      }

      const params = new URLSearchParams({
        state: state ?? "open",
        per_page: "20",
        sort: "updated",
        ...(assignee ? { assignee } : {}),
      });
      const res = await ghFetch(`/repos/${repo}/issues?${params}`, token);
      if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
      const issues = (await res.json() as Record<string, unknown>[]).filter((i) => !i.pull_request);
      return JSON.stringify({
        issues: issues.map((i) => ({
          number: i.number,
          title: i.title,
          assignees: ((i.assignees as Record<string, unknown>[]) ?? []).map((a) => a.login),
          labels: ((i.labels as Record<string, unknown>[]) ?? []).map((l) => l.name),
          createdAt: i.created_at,
          url: i.html_url,
          body: (i.body as string)?.slice(0, 300),
        })),
        total: issues.length,
      });
    } catch (err) {
      return githubError("list_issues", err);
    }
  },
  {
    name: "list_github_issues",
    description: "List GitHub issues assigned to you or in a specific repo. Use when user asks about bugs, tasks, or tickets.",
    schema: z.object({
      repo: z.string().optional().describe("owner/repo format. Omit to get all issues assigned to you."),
      state: z.enum(["open", "closed", "all"]).default("open"),
      assignee: z.string().optional().describe("GitHub username. Defaults to current user (@me)."),
    }),
  }
);

export const getPRDetailsTool = tool(
  async ({ repo, prNumber }: { repo: string; prNumber: number }, config?: RunnableConfig) => {
    try {
      const token = getToken(config);
      const [prRes, reviewsRes, filesRes] = await Promise.all([
        ghFetch(`/repos/${repo}/pulls/${prNumber}`, token),
        ghFetch(`/repos/${repo}/pulls/${prNumber}/reviews`, token),
        ghFetch(`/repos/${repo}/pulls/${prNumber}/files?per_page=20`, token),
      ]);
      if (!prRes.ok) throw new Error(`GitHub API ${prRes.status}: ${await prRes.text()}`);

      const pr = await prRes.json() as Record<string, unknown>;
      const reviews = reviewsRes.ok ? await reviewsRes.json() as Record<string, unknown>[] : [];
      const files = filesRes.ok ? await filesRes.json() as Record<string, unknown>[] : [];

      return JSON.stringify({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        draft: pr.draft,
        author: (pr.user as Record<string, unknown>)?.login,
        body: (pr.body as string)?.slice(0, 500),
        base: (pr.base as Record<string, unknown>)?.ref,
        head: (pr.head as Record<string, unknown>)?.ref,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files,
        filesChanged: files.slice(0, 10).map((f) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
        })),
        reviews: reviews.map((r) => ({
          reviewer: (r.user as Record<string, unknown>)?.login,
          state: r.state,
          submittedAt: r.submitted_at,
        })),
        url: pr.html_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
      });
    } catch (err) {
      return githubError("get_pr_details", err);
    }
  },
  {
    name: "get_github_pr",
    description: "Get full details of a specific GitHub PR including files changed and review status. Use after list_github_prs when user wants to dig into a specific PR.",
    schema: z.object({
      repo: z.string().describe("Repository in owner/repo format"),
      prNumber: z.number().describe("PR number from list_github_prs"),
    }),
  }
);

export const createIssueTool = tool(
  async (
    { repo, title, body, labels, assignees }: {
      repo: string; title: string; body?: string; labels?: string[]; assignees?: string[];
    },
    config?: RunnableConfig
  ) => {
    try {
      const token = getToken(config);
      const res = await ghFetch(`/repos/${repo}/issues`, token, {
        method: "POST",
        body: JSON.stringify({ title, body: body ?? "", labels: labels ?? [], assignees: assignees ?? [] }),
      });
      if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
      const issue = await res.json() as Record<string, unknown>;
      return JSON.stringify({
        success: true,
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
        message: `Issue #${issue.number} created in ${repo}`,
      });
    } catch (err) {
      return githubError("create_issue", err);
    }
  },
  {
    name: "create_github_issue",
    description: "Create a new GitHub issue in a repository. Use when user wants to log a bug, task, or feature request.",
    schema: z.object({
      repo: z.string().describe("Repository in owner/repo format e.g. 'octocat/hello-world'"),
      title: z.string().describe("Issue title"),
      body: z.string().optional().describe("Issue description/body"),
      labels: z.array(z.string()).optional().describe("Label names e.g. ['bug', 'enhancement']"),
      assignees: z.array(z.string()).optional().describe("GitHub usernames to assign"),
    }),
  }
);
