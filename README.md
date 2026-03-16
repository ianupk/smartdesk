# SmartDesk — AI Productivity Assistant

A conversational AI assistant that connects Gmail, Google Calendar, Slack, Zoom, GitHub, and Todoist — powered by LangGraph and Groq (free tier).

🔗 [Live Demo](https://smartdesk-theta.vercel.app) · [GitHub](https://github.com/ianupk/smartdesk)

---

## Quick Start

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Setup

Copy `.env.local` and fill in your keys. The only **required** key to get the chat working is:

```
GROQ_API_KEY=your_key_here   # Free at console.groq.com
```

Everything else enables specific integrations — connect them from **Dashboard → Integrations**.

### Switching LLM models

Set `GROQ_MODEL` in `.env.local`:

| Model | Notes |
|-------|-------|
| `llama-3.3-70b-versatile` | Default — best tool-calling quality |
| `llama-3.1-8b-instant` | Faster — use if you hit rate limits frequently |

---

## Architecture

```
User message
    │
    ▼
POST /api/chat/[threadId]
    │  ├─ Refresh Google/Zoom tokens
    │  ├─ getGraph(config) → cached compiled graph
    │  └─ SSE stream back to client
    │
    ▼
LangGraph StateGraph
    agent (Groq LLM) ──tool_calls──▶ ToolNode
         ▲                                │
         └────────── tool results ────────┘
```

### Integrations

| Integration | Tools | Capabilities |
|-------------|-------|-------|
| Gmail | 6 | List, read, send, reply, search, mark read |
| Calendar | 6 | List, conflicts, create, update, delete, free slots |
| Slack | 5 | Channels, send, read, search, announce meeting |
| Zoom | 5 | List, create, get, update, delete |
| GitHub | 1 | List repos |
| Todoist | 7 | List, create, complete, update, delete, move, projects |
| **Total** | **30** | Stays within free-tier LLM limits |

---

## Database

Uses PostgreSQL via Prisma. LangGraph uses it as a checkpointer for persistent conversation memory.

Falls back to in-memory (`MemorySaver`) if `DATABASE_URL` is not set — fine for local dev, but conversations won't persist across server restarts.

```bash
# Local dev with Docker
docker run -e POSTGRES_USER=smartdesk -e POSTGRES_PASSWORD=smartdesk_secret \
           -e POSTGRES_DB=smartdesk -p 5432:5432 postgres:16
```

---

## Timezone

The app defaults to `Asia/Kolkata`. To change it, update the `timezone` field in `src/app/api/chat/[threadId]/route.ts`:

```ts
configurable: {
    timezone: "America/New_York", // your timezone
}
```

Or set `DEFAULT_TIMEZONE` in `.env.local` as a fallback.

---

## Key Design Decisions

- **Graph caching** — `getGraph()` caches compiled graphs by integration signature. Only recompiles when a user connects or disconnects a service.
- **Message trimmer** — keeps context under 14,000 chars to stay within free-tier model limits, always preserving tool call / result pairs together.
- **Timezone-aware calendar** — event creation and free slot detection use the user's local timezone, not UTC.
- **Interrupt flows** — destructive actions (create, update, delete) require explicit user confirmation before execution.
- **Rate-limit retry** — automatically retries on TPM limit hits. Shows a friendly message when the daily limit is reached.
