/**
 * Notion Tools for LangGraph
 *
 * Token flows: session → config.configurable.notionAccessToken → here
 * Notion tokens don't expire — no refresh needed.
 *
 * Most common Notion use cases:
 *   1. Search pages/databases
 *   2. Get page content
 *   3. Create a new page (in a database or as a standalone page)
 *   4. Append content blocks to an existing page
 *   5. List databases (for finding where to create records)
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Client } from "@notionhq/client";
import type { RunnableConfig } from "@langchain/core/runnables";

function getClient(config?: RunnableConfig): Client {
    const token = config?.configurable?.notionAccessToken as string | undefined;
    if (!token) {
        throw new Error(
            "Notion is not connected. Please go to Dashboard → Connect Notion.",
        );
    }
    return new Client({ auth: token });
}

function notionError(toolName: string, err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    const friendly: Record<string, string> = {
        unauthorized:
            "Notion token is invalid or expired. Please reconnect Notion from the Dashboard.",
        restricted_resource:
            "You don't have access to this Notion resource. Make sure you shared it with your integration.",
        object_not_found:
            "Notion page or database not found. Make sure it's shared with your integration.",
        validation_error: "Invalid data format for Notion API.",
    };
    for (const [key, val] of Object.entries(friendly)) {
        if (msg.toLowerCase().includes(key))
            return JSON.stringify({ error: val });
    }
    console.error(`[notion:${toolName}]`, err);
    return JSON.stringify({ error: msg });
}

export const searchNotionTool = tool(
    async ({ query }: { query: string }, config?: RunnableConfig) => {
        try {
            const notion = getClient(config);
            const res = await notion.search({
                query,
                page_size: 10,
                filter: { value: "page", property: "object" },
                sort: {
                    direction: "descending",
                    timestamp: "last_edited_time",
                },
            });

            const results = res.results.map((r) => {
                const page = r as Record<string, unknown>;
                const props =
                    (page.properties as Record<string, unknown>) ?? {};
                const titleProp = Object.values(props).find(
                    (p) => (p as Record<string, unknown>)?.type === "title",
                ) as Record<string, unknown> | undefined;
                const titleArr =
                    (titleProp?.title as Array<{ plain_text: string }>) ?? [];
                const title =
                    titleArr.map((t) => t.plain_text).join("") || "Untitled";

                return {
                    id: page.id,
                    title,
                    type: page.object,
                    url: page.url,
                    lastEdited: page.last_edited_time,
                };
            });

            return JSON.stringify({ results, total: results.length });
        } catch (err) {
            return notionError("search", err);
        }
    },
    {
        name: "search_notion",
        description:
            "Search Notion pages and documents by keyword. Use when user wants to find a Notion page, note, or document.",
        schema: z.object({
            query: z.string().describe("Search query to find Notion pages"),
        }),
    },
);

export const getNotionPageTool = tool(
    async ({ pageId }: { pageId: string }, config?: RunnableConfig) => {
        try {
            const notion = getClient(config);

            const page = (await notion.pages.retrieve({
                page_id: pageId,
            })) as Record<string, unknown>;

            const blocks = await notion.blocks.children.list({
                block_id: pageId,
                page_size: 50,
            });

            const content = blocks.results
                .map((block) => {
                    const b = block as Record<string, unknown>;
                    const type = b.type as string;
                    const blockData = b[type] as
                        | Record<string, unknown>
                        | undefined;
                    if (!blockData) return null;

                    const richText =
                        (blockData.rich_text as Array<{
                            plain_text: string;
                        }>) ?? [];
                    const text = richText.map((t) => t.plain_text).join("");

                    const prefixes: Record<string, string> = {
                        heading_1: "# ",
                        heading_2: "## ",
                        heading_3: "### ",
                        bulleted_list_item: "• ",
                        numbered_list_item: "1. ",
                        to_do: (blockData.checked as boolean) ? "☑ " : "☐ ",
                        quote: "> ",
                        code: "```\n",
                    };

                    return text ? `${prefixes[type] ?? ""}${text}` : null;
                })
                .filter(Boolean)
                .join("\n");

            const props = (page.properties as Record<string, unknown>) ?? {};
            const titleProp = Object.values(props).find(
                (p) => (p as Record<string, unknown>)?.type === "title",
            ) as Record<string, unknown> | undefined;
            const titleArr =
                (titleProp?.title as Array<{ plain_text: string }>) ?? [];
            const title =
                titleArr.map((t) => t.plain_text).join("") || "Untitled";

            return JSON.stringify({
                id: pageId,
                title,
                url: page.url,
                lastEdited: page.last_edited_time,
                content: content.slice(0, 4000),
            });
        } catch (err) {
            return notionError("get_page", err);
        }
    },
    {
        name: "get_notion_page",
        description:
            "Get the content of a specific Notion page by its ID. Use after search_notion to read the full content of a page.",
        schema: z.object({
            pageId: z
                .string()
                .describe("Notion page ID from search_notion results"),
        }),
    },
);

export const createNotionPageTool = tool(
    async (
        {
            title,
            content,
            parentPageId,
            databaseId,
        }: {
            title: string;
            content: string;
            parentPageId?: string;
            databaseId?: string;
        },
        config?: RunnableConfig,
    ) => {
        try {
            const notion = getClient(config);

            const parent = databaseId
                ? { database_id: databaseId }
                : parentPageId
                  ? { page_id: parentPageId }
                  : { type: "workspace", workspace: true };

            const contentBlocks = content
                .split("\n")
                .filter((line) => line.trim())
                .slice(0, 50)
                .map((line) => {
                    if (line.startsWith("# "))
                        return {
                            type: "heading_1" as const,
                            heading_1: {
                                rich_text: [
                                    {
                                        type: "text" as const,
                                        text: { content: line.slice(2) },
                                    },
                                ],
                            },
                        };
                    if (line.startsWith("## "))
                        return {
                            type: "heading_2" as const,
                            heading_2: {
                                rich_text: [
                                    {
                                        type: "text" as const,
                                        text: { content: line.slice(3) },
                                    },
                                ],
                            },
                        };
                    if (line.startsWith("• ") || line.startsWith("- "))
                        return {
                            type: "bulleted_list_item" as const,
                            bulleted_list_item: {
                                rich_text: [
                                    {
                                        type: "text" as const,
                                        text: { content: line.slice(2) },
                                    },
                                ],
                            },
                        };
                    return {
                        type: "paragraph" as const,
                        paragraph: {
                            rich_text: [
                                {
                                    type: "text" as const,
                                    text: { content: line },
                                },
                            ],
                        },
                    };
                });

            const props: Record<string, unknown> = databaseId
                ? {
                      Name: {
                          title: [{ type: "text", text: { content: title } }],
                      },
                  }
                : {
                      title: {
                          title: [{ type: "text", text: { content: title } }],
                      },
                  };

            const page = await notion.pages.create({
                parent: parent as Parameters<
                    typeof notion.pages.create
                >[0]["parent"],
                properties: props as Parameters<
                    typeof notion.pages.create
                >[0]["properties"],
                children: contentBlocks as Parameters<
                    typeof notion.pages.create
                >[0]["children"],
            });

            return JSON.stringify({
                success: true,
                pageId: page.id,
                url: (page as Record<string, unknown>).url,
                title,
                message: `Page "${title}" created in Notion.`,
            });
        } catch (err) {
            return notionError("create_page", err);
        }
    },
    {
        name: "create_notion_page",
        description:
            "Create a new Notion page with content. Use when user wants to write notes, create a document, or add a record to Notion.",
        schema: z.object({
            title: z.string().describe("Page title"),
            content: z
                .string()
                .describe(
                    "Page content. Use markdown-like formatting: # for h1, ## for h2, • for bullets",
                ),
            parentPageId: z
                .string()
                .optional()
                .describe(
                    "ID of parent page to nest under (from search_notion)",
                ),
            databaseId: z
                .string()
                .optional()
                .describe("Database ID to add as a database record"),
        }),
    },
);

export const appendToNotionPageTool = tool(
    async (
        { pageId, content }: { pageId: string; content: string },
        config?: RunnableConfig,
    ) => {
        try {
            const notion = getClient(config);

            const blocks = content
                .split("\n")
                .filter((line) => line.trim())
                .slice(0, 50)
                .map((line) => ({
                    type: "paragraph" as const,
                    paragraph: {
                        rich_text: [
                            { type: "text" as const, text: { content: line } },
                        ],
                    },
                }));

            await notion.blocks.children.append({
                block_id: pageId,
                children: blocks,
            });

            return JSON.stringify({
                success: true,
                message: `Content appended to Notion page successfully.`,
            });
        } catch (err) {
            return notionError("append_page", err);
        }
    },
    {
        name: "append_to_notion_page",
        description:
            "Append text content to an existing Notion page. Use when user wants to add notes, updates, or text to an existing Notion page.",
        schema: z.object({
            pageId: z
                .string()
                .describe(
                    "Notion page ID (from search_notion or create_notion_page)",
                ),
            content: z.string().describe("Content to append to the page"),
        }),
    },
);

export const listNotionDatabasesTool = tool(
    async (_: object, config?: RunnableConfig) => {
        try {
            const notion = getClient(config);
            const res = await notion.search({
                filter: { value: "database", property: "object" },
                page_size: 20,
                sort: {
                    direction: "descending",
                    timestamp: "last_edited_time",
                },
            });

            const databases = res.results.map((r) => {
                const db = r as Record<string, unknown>;
                const titleArr =
                    (db.title as Array<{ plain_text: string }>) ?? [];
                const title =
                    titleArr.map((t) => t.plain_text).join("") ||
                    "Untitled Database";
                return {
                    id: db.id,
                    title,
                    url: db.url,
                    lastEdited: db.last_edited_time,
                };
            });

            return JSON.stringify({ databases, total: databases.length });
        } catch (err) {
            return notionError("list_databases", err);
        }
    },
    {
        name: "list_notion_databases",
        description:
            "List all Notion databases the integration has access to. Use when user wants to see their Notion databases or add records to a database.",
        schema: z.object({}),
    },
);
