# ChaiGPT — Web Search Tool Calling + Chat Branching

A ChatGPT-style streaming chat app built on Next.js, the AI SDK, Prisma/Postgres, and Clerk — extended with:

- **Web search tool calling** — the model decides when to search the live web (via Tavily) and streams the search + its grounded answer.
- **Chat branching** — fork a new, independent conversation from any previous message without losing the original thread.

## Stack

- Next.js 16 (App Router) + React 19
- AI SDK v7 (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`) — streaming, tool calling
- Prisma 7 + Postgres
- Clerk (auth)
- Tailwind + shadcn/ui (Base UI primitives)

## 1. Setup

```bash
npm install
```

### Environment variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

| Variable | Where to get it |
| --- | --- |
| `DATABASE_URL` | A Postgres connection string (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com), or local Postgres) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | [Clerk dashboard](https://dashboard.clerk.com) → your app → API Keys |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/api-keys) |
| `TAVILY_API_KEY` | [tavily.com](https://tavily.com) → sign up → API key. Free tier includes **1,000 searches/month** — plenty for this project. Tavily is used because it returns clean, pre-summarized results built for LLMs (vs. raw HTML from a generic search API), which keeps grounded answers accurate and short. |

### Database

```bash
npx prisma generate
npx prisma migrate deploy   # or `migrate dev` locally
```

This applies all migrations, including the branching migration
(`prisma/migrations/20260718120000_chat_branching`), which:
- adds `Message.parentId` (turns messages into a tree instead of a flat list)
- adds a `Branch` model (a named pointer at a leaf message)
- backfills every existing conversation with a linear "Main" branch, so old data keeps working

### Run

```bash
npm run dev
```

## 2. How it works

### Web search tool calling (`features/ai/tools/web-search-tool.ts`)

- Defined with the AI SDK's `tool()` helper; the model decides for itself when to call it (no manual routing).
- `app/api/chat/route.ts` passes `tools: { webSearch }` and `stopWhen: stepCountIs(5)`, so the model can search, read the results, and keep generating — all in one streamed response.
- Tool calls/results stream to the client as ordinary message parts (`type: "tool-webSearch"`) and render as a collapsible "Searched the web for…" card (`features/ai/components/web-search-call.tsx`) with loading, result-link, and error states.
- Because tool parts live on `message.parts`, they're persisted to Postgres exactly like text — no separate storage path needed.
- Errors (missing key, network failure, non-200 response) are caught inside the tool and returned as a structured `{ error }` output instead of throwing, so a bad search never crashes the stream.

### Chat branching (`features/branches/`, `prisma/schema.prisma`)

Messages form a **tree**, not a list: every message has a `parentId`. A `Branch` is just a named pointer (`headMessageId`) into that tree. Loading a branch's history means walking `parentId` from its head back to the root.

This means forking never duplicates messages — a new branch just points at the message you forked from, and only diverges once you send something new on it:

```
        ┌─ msg3 ─ msg4        (Main)
msg1 ─ msg2
        └─ msg3' ─ msg5       (Branch: "alt approach")
```

- **Create** — the branch icon next to any message → "New branch from here" (`features/branches/components/message-branch-menu.tsx`)
- **Navigate** — the branch switcher in the header, or the same per-message menu (which also lists any branches already forked from that message)
- **Rename / delete** — from the header switcher's hover actions (the Main branch can't be deleted)
- **Persistence** — the active branch lives in the URL (`/c/[id]?branch=[branchId]`), so refreshing or sharing a link keeps you on the same branch

## 3. Deployment (Vercel)

1. Push this repo to GitHub.
2. Import it in [Vercel](https://vercel.com/new).
3. Add the same environment variables from `.env.example` in the Vercel project settings.
4. Vercel's build step runs `prisma generate` automatically via `postinstall` (already configured) — point `DATABASE_URL` at a reachable Postgres instance (Neon/Supabase both work well with serverless).
5. After the first deploy, run `npx prisma migrate deploy` against the production database (either locally with the prod `DATABASE_URL`, or via a one-off Vercel deployment hook).

## Project structure

```
app/api/chat/route.ts          # streaming endpoint: auth, branch check, tool calling, persistence
features/ai/tools/             # web search tool
features/ai/components/        # tool-call renderer
features/ai/actions/           # branch-aware message load/save (tree walk)
features/branches/             # branch CRUD server actions, hooks, and UI
features/conversation/         # chat shell, message list, composer
prisma/schema.prisma            # Message (tree) + Branch models
```
