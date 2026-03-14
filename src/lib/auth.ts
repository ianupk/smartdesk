import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
    session: { strategy: "jwt" },
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                try {
                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email },
                    });
                    if (!user?.password) return null;
                    const valid = await bcrypt.compare(credentials.password, user.password);
                    if (!valid) return null;
                    return { id: user.id, email: user.email, name: user.name };
                } catch (err) {
                    console.error("[authorize] DB error:", err);
                    return null;
                }
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: [
                        "openid",
                        "email",
                        "profile",
                        "https://www.googleapis.com/auth/gmail.readonly",
                        "https://www.googleapis.com/auth/gmail.send",
                        "https://www.googleapis.com/auth/gmail.modify",
                        "https://www.googleapis.com/auth/calendar",
                        "https://www.googleapis.com/auth/calendar.events",
                    ].join(" "),
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === "google" && user.email) {
                try {
                    const dbUser = await prisma.user.upsert({
                        where: { email: user.email },
                        create: {
                            email: user.email,
                            name: user.name ?? null,
                            image: user.image ?? null,
                        },
                        update: {
                            name: user.name ?? undefined,
                            image: user.image ?? undefined,
                        },
                    });
                    if (account.access_token) {
                        await prisma.integration.upsert({
                            where: {
                                userId_provider: {
                                    userId: dbUser.id,
                                    provider: "google",
                                },
                            },
                            create: {
                                userId: dbUser.id,
                                provider: "google",
                                accessToken: account.access_token,
                                refreshToken: account.refresh_token ?? null,
                                scope: account.scope ?? null,
                            },
                            update: {
                                accessToken: account.access_token,
                                refreshToken: account.refresh_token ?? null,
                                scope: account.scope ?? null,
                            },
                        });
                    }
                    user.id = dbUser.id;
                } catch (err) {
                    console.error("[signIn] DB error:", err);
                    return true;
                }
            }
            return true;
        },
        async jwt({ token, user, account }) {
            if (user?.id) token.userId = user.id;
            if (account?.provider === "google" && !token.userId && token.email) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { email: token.email as string },
                    });
                    if (dbUser) token.userId = dbUser.id;
                } catch (err) {
                    console.error("[jwt] DB lookup error:", err);
                }
            }
            return token;
        },
        async session({ session, token }) {
            session.userId = token.userId as string;
            if (session.userId) {
                try {
                    const integrations = await prisma.integration.findMany({
                        where: { userId: session.userId },
                        select: {
                            provider: true,
                            accessToken: true,
                            teamName: true,
                        },
                    });
                    for (const i of integrations) {
                        switch (i.provider) {
                            case "google":
                                session.googleAccessToken = i.accessToken;
                                break;
                            case "slack":
                                session.slackAccessToken = i.accessToken;
                                session.hasSlack = true;
                                break;
                            case "zoom":
                                session.zoomAccessToken = i.accessToken;
                                session.hasZoom = true;
                                session.zoomName = i.teamName ?? undefined;
                                break;
                            case "github":
                                session.githubAccessToken = i.accessToken;
                                session.hasGithub = true;
                                session.githubUsername = i.teamName ?? undefined;
                                break;
                            case "todoist":
                                session.todoistAccessToken = i.accessToken;
                                session.hasTodoist = true;
                                session.todoistName = i.teamName ?? undefined;
                                break;
                        }
                    }
                    if (!integrations.find((i) => i.provider === "slack")) session.hasSlack = false;
                    if (!integrations.find((i) => i.provider === "zoom")) session.hasZoom = false;
                    if (!integrations.find((i) => i.provider === "github")) session.hasGithub = false;
                    if (!integrations.find((i) => i.provider === "todoist")) session.hasTodoist = false;
                } catch (err) {
                    console.error("[session] DB error:", err);
                }
            }
            return session;
        },
    },
    pages: { signIn: "/login", error: "/auth/error" },
};
