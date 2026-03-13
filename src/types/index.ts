import type { Session } from "next-auth";

declare module "next-auth" {
    interface Session {
        userId: string;
        googleAccessToken?: string;
        slackAccessToken?: string;
        zoomAccessToken?: string;
        githubAccessToken?: string;
        todoistAccessToken?: string;
        hasSlack?: boolean;
        hasZoom?: boolean;
        hasGithub?: boolean;
        hasTodoist?: boolean;
        zoomName?: string;
        githubUsername?: string;
        todoistName?: string;
    }
}

export type IntegrationProvider =
    | "google"
    | "slack"
    | "zoom"
    | "github"
    | "todoist";

export interface DashboardStats {
    totalThreads: number;
    totalMessages: number;
    integrations: {
        provider: string;
        connected: boolean;
        teamName?: string | null;
    }[];
    recentThreads: {
        id: string;
        title: string;
        updatedAt: Date;
        messageCount?: number;
        lastMessage?: string;
    }[];
}

export interface ChatThread {
    id: string;
    title: string;
    updatedAt: string;
    messageCount?: number;
    lastMessage?: string;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    toolCalls: string[];
    createdAt: Date;
}

export interface StreamEvent {
    type: "token" | "tool_call" | "done" | "error" | "interrupt";
    content?: string;
    tool?: string;
    message?: string;
}
