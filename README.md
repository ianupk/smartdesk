# ⚡ SmartDesk — AI Productivity Agent

An AI agent that connects Gmail, Google Calendar, and Slack via natural language.

## Stack

- **Frontend**: Next.js 15 + TypeScript
- **AI**: Any free AI provider
- **Auth**: NextAuth.js (Google + Slack OAuth)
- **APIs**: Gmail API, Google Calendar API, Slack Web API
- **Deploy**: Docker

---

## 💬 Example Prompts

| Prompt                               | What happens                    |
| ------------------------------------ | ------------------------------- |
| "Summarize my last 5 emails"         | Reads Gmail, AI summarizes each |
| "What's on my calendar this week?"   | Lists upcoming events           |
| "Schedule a standup tomorrow at 9am" | Checks conflicts, creates event |
| "Tell #general about the standup"    | Posts formatted announcement    |
| "Emails about the Q3 budget?"        | Gmail search + AI summary       |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # Google + Slack OAuth
│   │   └── chat/route.ts               # Claude agent endpoint
│   ├── auth/signin/page.tsx            # Login page
│   └── page.tsx                        # Main chat UI
└── lib/
    ├── agent.ts                        # Tool definitions + executor
    └── tools/
        ├── gmail.ts                    # Gmail API calls
        ├── calendar.ts                 # Google Calendar API calls
        └── slack.ts                    # Slack Web API calls
```
