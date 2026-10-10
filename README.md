# studytrack

A Discord study-tracker starter: track time spent in study voice channels, see it live.

## Stack

- **TanStack Start** (React 19, Vite, file routes, SSR) — `apps/web`
- **Convex** — the backend, database and realtime — `packages/backend`
- **Clerk** — auth, wired to Convex (Sign in with Discord) — `apps/web`
- **discord.js** gateway bot — joins voice channels, reports events to Convex — `apps/bot`
- **Tailwind v4 + shadcn**, **Vitest**, **ESLint + Prettier**

## Layout

```
apps/
  web/        TanStack Start app (Clerk + Convex + UI)
  bot/        discord.js gateway process
packages/
  backend/    Convex functions + generated API (shared by web and bot)
```

## Getting started

1. Install: `pnpm install`
2. Convex: `pnpm dev:db` (logs in, creates a deployment, writes `.env.local`, generates `convex/_generated`)
3. Web env: copy `apps/web/.env.example` to `apps/web/.env` and fill Clerk + Convex values
4. Web: `pnpm dev:web` → http://localhost:3000
5. Bot: copy `apps/bot/.env.example` to `apps/bot/.env`, then `pnpm dev:bot`

`pnpm dev` runs Convex + web together.

## Convex env

```
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-app>.clerk.accounts.dev
npx convex env set BOT_SHARED_SECRET <a-long-random-string>
```
