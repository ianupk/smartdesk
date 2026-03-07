import "next-auth";

declare module "next-auth" {
    interface Session {
        userId: string;
        googleAccessToken?: string;
        slackAccessToken?: string;
        hasSlack?: boolean;
    }
    interface User {
        id: string;
    }
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    toolCalls?: string[];
    createdAt: Date;
}

export interface ChatThread {
    id: string;
    title: string;
    lastMessage?: string;
    updatedAt: Date;
    messageCount?: number;
}

export interface StreamEvent {
    type: "tool_call" | "token" | "interrupt" | "done" | "error";
    tool?: string;
    content?: string;
    details?: Record<string, unknown>;
    message?: string;
}

export interface Integration {
    provider: "google" | "slack";
    connected: boolean;
    teamName?: string;
    email?: string;
}

export interface DashboardStats {
    totalThreads: number;
    totalMessages: number;
    integrations: Integration[];
    recentThreads: ChatThread[];
}
