---
name: domain-workflow
description: How this repo is split into domains, and how to keep files small and single-purpose. Covers Convex domain folders (queries / mutations / internal / service / validators / tests), pure decision logic in service.ts, the auth guards in lib/, the web hook facade over api.*, schema-derived types, and feature component folders. Use when adding or changing a Convex function, a read or write, a web feature, a custom hook, a type, or when a file is getting long and you are about to split it.
compatibility: opencode
---

## North star

One concept per file, one responsibility per function. A file earns its
existence, then earns its split — you do **not** pre-create five files for a
domain that has one function. This is trikora-tanstack's `src/api/{domain}/`
shape, translated to Convex: the framework changed, the seams did not.

The four seams, in every layer:

1. **Transport / wiring** — thin. Auth, load, delegate, persist. No decisions.
2. **Logic** — pure functions. No `ctx`, no framework, no clock you can't pass in.
3. **Shape / types** — validators (Convex) or interfaces (web), derived, never duplicated.
4. **Tests** — colocated, sit next to the file they cover.

## Backend: a Convex domain

A domain starts as one flat file and becomes a folder when it earns one. The
generated API path is the directory path, so nesting is visible to callers:
`convex/sessions/queries.ts` → `api.sessions.queries.*`.

```
packages/backend/convex/
  schema.ts                 # tables ONLY — all v.* validators for stored docs live here
  lib/
    auth.ts                 # requireUser(ctx) / requireBot(ctx, secret) — the shared guards
  sessions/
    queries.ts              # public reads (query)
    mutations.ts            # public writes (mutation) — thin orchestrators
    internal.ts             # internalQuery / internalMutation for crons + other modules
    service.ts              # PURE decision logic; no ctx, no Convex imports
    validators.ts           # shared v.* for args/results + derived types
    service.test.ts         # pure-logic tests; no Convex runtime needed
```

| File | Holds | Never holds |
|---|---|---|
| `queries.ts` | `query({...})` exports: auth guard, index read, return | business decisions |
| `mutations.ts` | `mutation({...})`: guard, load, call `service.ts`, write | the decision logic itself |
| `internal.ts` | non-client functions (cron targets, cross-module helpers) | anything a client calls |
| `service.ts` | pure functions of plain data — the "does this open or close?" rule | `ctx`, `_generated`, `v`, dates from `Date.now()` (pass `now` in) |
| `validators.ts` | reused `v.object`/`v.union` + `type X = Infer<typeof x>` | tables (those live in `schema.ts`) |
| `*.test.ts` | `convex-test` for functions, plain Vitest for `service.ts` | — |

### Why service.ts exists

This is the whole point of the pattern. `convex/bot.ts` already does the first
half: a 12-line `mutation` that authenticates and delegates, with the payload
validators in `bot/types.ts` and the handler in `bot/service.ts`. The remaining
seam is to make that service **pure**: today `bot/service.ts:40` mixes the
channel-set decision with database reads. Extract the decision into a plain
function and let the service only persist its verdict.

```ts
// convex/sessions/service.ts — pure, unit-testable, no Convex imports
export type VoiceAction = { type: 'open'; channelId: string } | { type: 'close' } | { type: 'noop' }

export function resolveVoiceAction(
  studyChannelIds: readonly string[],
  from: string | null,
  to: string | null,
): VoiceAction {
  const study = new Set(studyChannelIds)
  const was = from !== null && study.has(from)
  const is = to !== null && study.has(to)
  if (was && !is) return { type: 'close' }
  if (!was && is && to) return { type: 'open', channelId: to }
  return { type: 'noop' }
}
```

`service.test.ts` covers every transition with no database; the mutation stays
thin. Same idea as trikora's `service.ts` taking a mocked client.

### Guards, not middleware

Convex has no middleware chain. The analogue of trikora's `withAuth` /
`withRequireAuth` is one `lib/auth.ts`, imported by every domain:

```ts
// convex/lib/auth.ts
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new ConvexError({ code: 'unauthenticated' })
  return identity
}
```

Reads that should return empty rather than throw (`sessions.ts:6` returns `[]`)
call `ctx.auth.getUserIdentity()` inline — that intent is different, keep it.

### Convex-specific rules (do not translate away)

- Function identity is the **file path**. Moving a function into a folder
  renames `api.sessions.listActive` → `api.sessions.queries.listActive`; update
  every caller in the same change.
- `_generated/` is generated — never hand-edit, never hand-write an `api`
  barrel (trikora's `src/api/index.ts` has no Convex equivalent; Convex
  generates it).
- Bounded reads: `.take(n)` / paginate, never `.collect()` unless the caller
  asked for everything.
- Time: `Date.now()` in mutations/actions; in a `service.ts` pure function, take
  `now: number` as an argument.

## Frontend: a web feature

`apps/web/src/routes/` holds **only** route files (TanStack file routes). UI and
logic live in feature folders; the route stays thin.

```
apps/web/src/
  routes/dashboard.tsx        # beforeLoad guard + loader prefetch + <Dashboard/>
  features/dashboard/
    index.tsx                 # the view, composition only
    useActiveSessions.ts      # the custom hook (below)
    types.ts                  # view-model types, derived from Doc<...>
  components/dashboard/
    SessionList.tsx
    SessionRow.tsx            # split out when the parent passes ~150 lines
```

### Custom hooks are the component's facade over `api.*`

Components never reach into `api.*` paths or know query shapes; they call a
named hook. The hook wraps Convex's own hook — it does **not** invent query keys
(Convex owns those, unlike trikora's React Query layer).

```ts
// features/dashboard/useActiveSessions.ts
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@studytrack/backend/convex/_generated/api'
import { useSuspenseQuery } from '@tanstack/react-query'

export function useActiveSessions() {
  return useSuspenseQuery(convexQuery(api.sessions.queries.listActive, {})).data
}
```

The route loader prefetches through the *same* `convexQuery(...)` expression the
hook uses — one source, no key drift (`dashboard.tsx:13` and `:20` already do
this; move the shared expression into the hook when you split).

### Types come from the schema

Re-export `Doc<'studySessions'>` / `Infer<typeof validator>` from the domain;
never retype a row by hand. The web `types.ts` is for view models the schema
does not carry (e.g. a formatted duration), not duplicates of it.

## The split checklist

Before adding a file, ask:

1. Is this **wiring** or **logic**? Logic → a `service.ts` pure function.
2. Is this **shape**? → a validator in `validators.ts` / `schema.ts`, and derive.
3. Is this the **component's view**? → a `use*` hook, then the component.
4. Is the file past ~150 lines, or doing two jobs? → it becomes a folder
   (`index.tsx` + `hooks.ts` + `types.ts` + subcomponents), not a longer file.
5. Is it generated? → leave it alone.

## Worked example: the `bot` split (done) and `sessions` (next)

`bot` shows the target shape today:

- `bot.ts` (12 lines) — `mutation`, `args` from `bot/types.ts`, delegates.
- `bot/types.ts` — `recordVoiceEventArgs` validator + `Infer` types + result union.
- `bot/service.ts` — the handler, still coupled to `ctx.db`; sharpen it by
  extracting the `wasInStudy`/`isInStudy` branch into a pure `resolveVoiceAction`.

`sessions` is the next candidate: `sessions.ts` (52 lines) holds `listActive`,
`listRecent` and `closeStale` in one file. When you next touch it, split to
`sessions/queries.ts`, `sessions/internal.ts`, and move the 8-hour rule into a
pure `sessions/service.ts` function that takes `now`.

Apply the pattern to a domain the first time you touch it; do not sweep the
codebase to satisfy it.
