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
                    const valid = await bcrypt.compare(
                        credentials.password,
                        user.password,
                    );
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
        // ── signIn: upsert user + save Google tokens ───────────────────
        async signIn({ user, account }) {
            // Only do DB work for Google OAuth — credentials are handled in authorize()
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

                    // Store Google access token so tools can use it
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

                    // Attach the real DB id so the jwt callback can read it
                    user.id = dbUser.id;
                } catch (err) {
                    console.error("[signIn] DB error:", err);
                    return true;
                }
            }
            return true;
        },

        // ── jwt: attach userId to token ────────────────────────────────
        async jwt({ token, user, account }) {
            // First sign-in: user object is present
            if (user?.id) {
                token.userId = user.id;
            }

            // For Google sign-in, user.id is set above in signIn callback
            // But as a fallback, look up by email
            if (
                account?.provider === "google" &&
                !token.userId &&
                token.email
            ) {
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

        // ── session: attach tokens to session ─────────────────────────
        async session({ session, token }) {
            session.userId = token.userId as string;

            if (session.userId) {
                try {
                    const integrations = await prisma.integration.findMany({
                        where: { userId: session.userId },
                    });
                    const google = integrations.find(
                        (i: { provider: string }) => i.provider === "google",
                    );
                    const slack = integrations.find(
                        (i: { provider: string }) => i.provider === "slack",
                    );
                    if (google) session.googleAccessToken = google.accessToken;
                    if (slack) {
                        session.slackAccessToken = slack.accessToken;
                        session.hasSlack = true;
                    }
                } catch (err) {
                    console.error("[session] DB error:", err);
                }
            }

            return session;
        },
    },

    pages: {
        signIn: "/login",
        error: "/auth/error",
    },
};
