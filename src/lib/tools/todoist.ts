/**
 * Todoist Tools for LangGraph
 *
 * Token: config.configurable.todoistAccessToken (no expiry, no refresh)
 * API: Todoist REST API v2 (api.todoist.com/rest/v2)
 *
 * Most common task management use cases:
 *   1. list_todoist_tasks    — today's tasks, overdue, or by project
 *   2. create_todoist_task   — add a task with due date from natural language
 *   3. complete_todoist_task — mark a task as done
 *   4. list_todoist_projects — see all projects
 *   5. update_todoist_task   — change due date, priority, or description
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { RunnableConfig } from "@langchain/core/runnables";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getToken(config?: RunnableConfig): string {
  const token = config?.configurable?.todoistAccessToken as string | undefined;
  if (!token) throw new Error("Todoist is not connected. Go to Dashboard → Connect Todoist.");
  return token;
}

function todoistError(toolName: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const map: Record<string, string> = {
    "401": "Todoist token is invalid. Please reconnect from the Dashboard.",
    "403": "Access denied. Check your Todoist permissions.",
    "404": "Task or project not found.",
    "429": "Todoist rate limit reached. Please wait a moment and try again.",
  };
  for (const [k, v] of Object.entries(map)) {
    if (msg.includes(k)) return JSON.stringify({ error: v });
  }
  console.error(`[todoist:${toolName}]`, err);
  return JSON.stringify({ error: msg });
}

async function tdFetch(path: string, token: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(`https://api.todoist.com/api/v1${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
  });
}

// Priority label map (Todoist uses 1-4 where 4 = urgent)
const PRIORITY_LABEL: Record<number, string> = { 1: "normal", 2: "medium", 3: "high", 4: "urgent" };

// ── Tools ─────────────────────────────────────────────────────────────────────

export const listTasksTool = tool(
  async (
    { filter, projectId, limit }: { filter?: string; projectId?: string; limit?: number },
    config?: RunnableConfig
  ) => {
    try {
      const token = getToken(config);
      const params = new URLSearchParams();
      // Default filter: today + overdue — the most useful daily view
      if (filter) params.set("filter", filter);
      else if (!projectId) params.set("filter", "today | overdue");
      if (projectId) params.set("project_id", projectId);

      const res = await tdFetch(`/tasks?${params}`, token);
      if (!res.ok) throw new Error(`Todoist API ${res.status}: ${await res.text()}`);
      const raw = await res.json();
      // v1 API may return { results: [...] } (paginated) or a plain array
      const tasks = (Array.isArray(raw) ? raw : (raw as Record<string, unknown>).results ?? raw.items ?? []) as Record<string, unknown>[];

      const sliced = tasks.slice(0, limit ?? 20);
      return JSON.stringify({
        tasks: sliced.map((t) => ({
          id: t.id,
          content: t.content,
          description: (t.description as string)?.slice(0, 150),
          due: (t.due as Record<string, unknown>)?.string ?? (t.due as Record<string, unknown>)?.date ?? null,
          priority: PRIORITY_LABEL[(t.priority as number)] ?? "normal",
          projectId: t.project_id,
          labels: t.labels,
          isCompleted: t.is_completed,
          url: t.url,
        })),
        total: tasks.length,
        showing: sliced.length,
      });
    } catch (err) {
      return todoistError("list_tasks", err);
    }
  },
  {
    name: "list_todoist_tasks",
    description: "List Todoist tasks. Defaults to today's tasks + overdue. Use when user asks about their tasks, to-dos, what they need to do today, or what's overdue.",
    schema: z.object({
      filter: z.string().optional().describe("Todoist filter string e.g. 'today', 'overdue', 'p1', 'assigned to: me'. Leave blank for today+overdue."),
      projectId: z.string().optional().describe("Filter by specific project ID from list_todoist_projects"),
      limit: z.number().min(1).max(50).default(20).describe("Max tasks to return"),
    }),
  }
);

export const createTaskTool = tool(
  async (
    { content, description, dueString, priority, projectId, labels }: {
      content: string;
      description?: string;
      dueString?: string;
      priority?: number;
      projectId?: string;
      labels?: string[];
    },
    config?: RunnableConfig
  ) => {
    try {
      const token = getToken(config);
      const body: Record<string, unknown> = { content };
      if (description) body.description = description;
      if (dueString) body.due_string = dueString; // Natural language: "tomorrow", "next Monday", "every day"
      if (priority) body.priority = priority;
      if (projectId) body.project_id = projectId;
      if (labels?.length) body.labels = labels;

      const res = await tdFetch("/tasks", token, { method: "POST", body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`Todoist API ${res.status}: ${await res.text()}`);
      const task = await res.json() as Record<string, unknown>;

      return JSON.stringify({
        success: true,
        id: task.id,
        content: task.content,
        due: (task.due as Record<string, unknown>)?.string ?? null,
        priority: PRIORITY_LABEL[(task.priority as number)] ?? "normal",
        url: task.url,
        message: `Task "${task.content}" created${(task.due as Record<string, unknown>)?.string ? ` — due ${(task.due as Record<string, unknown>).string}` : ""}`,
      });
    } catch (err) {
      return todoistError("create_task", err);
    }
  },
  {
    name: "create_todoist_task",
    description: "Create a new Todoist task with optional due date and priority. Supports natural language due dates like 'tomorrow', 'next Monday', 'every weekday'. Use when user wants to add a task or reminder.",
    schema: z.object({
      content: z.string().describe("Task name/title"),
      description: z.string().optional().describe("Optional longer description"),
      dueString: z.string().optional().describe("Natural language due date: 'today', 'tomorrow', 'next Monday', 'every day at 9am'"),
      priority: z.number().min(1).max(4).optional().describe("Priority: 1=normal, 2=medium, 3=high, 4=urgent"),
      projectId: z.string().optional().describe("Project ID from list_todoist_projects"),
      labels: z.array(z.string()).optional().describe("Label names"),
    }),
  }
);

export const completeTaskTool = tool(
  async ({ taskId, content }: { taskId: string; content?: string }, config?: RunnableConfig) => {
    try {
      const token = getToken(config);
      const res = await tdFetch(`/tasks/${taskId}/close`, token, { method: "POST" });
      if (!res.ok && res.status !== 204) throw new Error(`Todoist API ${res.status}: ${await res.text()}`);
      return JSON.stringify({
        success: true,
        message: `Task "${content ?? taskId}" marked as complete ✓`,
      });
    } catch (err) {
      return todoistError("complete_task", err);
    }
  },
  {
    name: "complete_todoist_task",
    description: "Mark a Todoist task as complete. Use task ID from list_todoist_tasks. Use when user says they finished or completed a task.",
    schema: z.object({
      taskId: z.string().describe("Task ID from list_todoist_tasks"),
      content: z.string().optional().describe("Task name for confirmation message"),
    }),
  }
);

export const updateTaskTool = tool(
  async (
    { taskId, content, dueString, priority, description }: {
      taskId: string;
      content?: string;
      dueString?: string;
      priority?: number;
      description?: string;
    },
    config?: RunnableConfig
  ) => {
    try {
      const token = getToken(config);
      const body: Record<string, unknown> = {};
      if (content) body.content = content;
      if (dueString) body.due_string = dueString;
      if (priority) body.priority = priority;
      if (description !== undefined) body.description = description;

      const res = await tdFetch(`/tasks/${taskId}`, token, { method: "POST", body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`Todoist API ${res.status}: ${await res.text()}`);
      const task = await res.json() as Record<string, unknown>;

      return JSON.stringify({
        success: true,
        id: task.id,
        content: task.content,
        due: (task.due as Record<string, unknown>)?.string ?? null,
        priority: PRIORITY_LABEL[(task.priority as number)] ?? "normal",
        message: `Task updated successfully`,
      });
    } catch (err) {
      return todoistError("update_task", err);
    }
  },
  {
    name: "update_todoist_task",
    description: "Update a Todoist task — change its name, due date, or priority. Use when user wants to reschedule or edit a task.",
    schema: z.object({
      taskId: z.string().describe("Task ID from list_todoist_tasks"),
      content: z.string().optional().describe("New task name"),
      dueString: z.string().optional().describe("New due date: 'tomorrow', 'next Friday', etc."),
      priority: z.number().min(1).max(4).optional().describe("New priority: 1=normal, 2=medium, 3=high, 4=urgent"),
      description: z.string().optional().describe("New description"),
    }),
  }
);

export const listProjectsTool = tool(
  async (_: object, config?: RunnableConfig) => {
    try {
      const token = getToken(config);
      const res = await tdFetch("/projects", token);
      if (!res.ok) throw new Error(`Todoist API ${res.status}: ${await res.text()}`);
      const raw = await res.json();
      const projects = (Array.isArray(raw) ? raw : (raw as Record<string, unknown>).results ?? []) as Record<string, unknown>[];
      return JSON.stringify({
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          isFavorite: p.is_favorite,
          isInboxProject: p.is_inbox_project,
          taskCount: p.task_count ?? 0,
        })),
        total: projects.length,
      });
    } catch (err) {
      return todoistError("list_projects", err);
    }
  },
  {
    name: "list_todoist_projects",
    description: "List all Todoist projects. Use when user asks about their Todoist projects or before adding a task to a specific project.",
    schema: z.object({}),
  }
);
