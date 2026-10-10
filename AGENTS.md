# studytrack — agent guide

Discord study-tracker. People join a study voice channel; the bot reports the
event; Convex records the session; the web dashboard updates live.

## Layout

```
apps/
  web/        TanStack Start + Clerk + Convex + shadcn (the UI)
  bot/        discord.js gateway process (always-on)
packages/
  backend/    Convex: schema + functions + generated typed API
```

## Where things live

- **Data + realtime:** everything is a Convex function in `packages/backend/convex`.
  The client calls `api.*` directly (imported from
  `@studytrack/backend/convex/_generated/api`) — there is no `src/api` layer,
  no query keys, no `invalidateQueries`. Reads are live.
- **Web:** routes in `apps/web/src/routes`, wiring in `src/router.tsx`.
- **Bot:** `apps/bot/src`. It holds the Discord gateway and calls Convex
  through `ConvexHttpClient` using a shared secret.

## Hard rules

1. Never trust the browser or the bot for authorization: every Convex query and
   mutation checks `ctx.auth.getUserIdentity()` (users) or the shared secret
   (bot) before doing anything.
2. The bot is a dumb reporter: it forwards raw voice events; Convex decides
   whether they open/close a session.
3. `_generated/` and `routeTree.gen.ts` are generated — never edit by hand.

## Workflow

- `pnpm format` after edits (Prettier). `pnpm lint`, `pnpm typecheck` on request.
- `pnpm dev` runs Convex + web. The bot is separate (`pnpm dev:bot`).

## Style

- Mirrors `trikora-tanstack`: Prettier `semi:false, singleQuote, printWidth:100`,
  `~/*` and `@/*` → `src/*`, shadcn "new-york" + magicui, lucide icons.
- Components past ~150 lines become a folder.
