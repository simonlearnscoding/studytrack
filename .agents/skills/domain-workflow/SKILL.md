---
name: domain-workflow
description: How this repo is split into domains and kept testable — the Convex domain shape (thin `<domain>.ts` entry + `<domain>/service.ts` + `<domain>/types.ts`), pure ctx-free decision helpers, export-first file layout, state as a discriminated union, colocated tests (plain Vitest for pure logic, convex-test for I/O), the auth checks, the web hook facade over api.*, and schema-derived types. Use when adding or changing a Convex function, a read or write, a web feature, a custom hook, a type, a test, or when a file is getting long and you are about to split it.
compatibility: opencode
---

## North star

One concept per file, one responsibility per function. A file earns its
existence, then earns its split — you do **not** pre-create files for a domain
that has one function. This is trikora-tanstack's `src/api/{domain}/` shape,
translated to Convex: the framework changed, the seams did not.

The four seams, in every layer:

1. **Transport / wiring** — thin. Guard, load, delegate, persist. No decisions.
2. **Logic** — pure where it is a decision: no `ctx`, no framework, no clock you
   can't pass in.
3. **Shape / types** — validators (Convex) or view-model interfaces (web),
   derived, never duplicated.
4. **Tests** — colocated, next to the file they cover.

## Backend: a Convex domain

The shape the repo has settled on (see `bot/`, `sessions/`, `users/`,
`guildSettings/`). Registered functions stay in a **root-level** file so the
API path stays short: `convex/sessions.ts` → `api.sessions.listActive`.

```
packages/backend/convex/
  schema.ts                 # tables ONLY — all v.* for stored docs live here
  sessions.ts               # registered fns (query / mutation / internalMutation) — thin
  sessions/
    service.ts              # the work: ctx-taking I/O + pure, ctx-free decisions
    types.ts                # arg validators for the entry file + Infer types
    service.test.ts         # pure unit tests; no Convex runtime
  sessions.test.ts          # convex-test integration tests (at convex/ root)
```

| File                      | Holds                                                                         | Never holds                           |
| ------------------------- | ----------------------------------------------------------------------------- | ------------------------------------- |
| `<domain>.ts`             | `query` / `mutation` / `internalMutation` exports: auth, wire args, delegate  | business decisions, DB queries        |
| `<domain>/service.ts`     | the I/O (takes `ctx`) and the decisions (pure helpers)                        | `v` validators (those are `types.ts`) |
| `<domain>/types.ts`       | reused `v.object`/`v.union` args + `type X = Infer<typeof x>` + result unions | tables (those live in `schema.ts`)    |
| `<domain>/*.test.ts`      | pure unit tests, no runtime                                                   | —                                     |
| `<domain>.test.ts` (root) | `convex-test` integration tests                                               | —                                     |

Split further **only when earned**: pull a cron-only function into
`internal.ts`, or split `queries.ts`/`mutations.ts` out of the entry file, once
the entry file genuinely has two audiences. Until then, one entry file.

### service.ts: ctx at the I/O, purity at the decisions

`service.ts` is allowed to take `ctx` — that is how it reads and writes. The
**decision** inside it is a separate, pure helper with no `ctx`, exported so it
can be unit-tested with no database:

```ts
// convex/bot/service.ts — pure, no ctx, no Convex imports
export type StudyTransition =
  { kind: 'enter'; channelId: string } | { kind: 'leave' } | { kind: 'none' }

export function getStudyTransition(
  studyChannelIds: readonly string[],
  { fromChannelId, toChannelId }: { fromChannelId: string | null; toChannelId: string | null }
): StudyTransition {
  const study = new Set(studyChannelIds)
  const wasInStudy = fromChannelId !== null && study.has(fromChannelId)
  const isInStudy = toChannelId !== null && study.has(toChannelId)
  if (wasInStudy && !isInStudy) return { kind: 'leave' }
  if (!wasInStudy && isInStudy && toChannelId) return { kind: 'enter', channelId: toChannelId }
  return { kind: 'none' }
}
```

The I/O half (`getGuildSettings`, `closeActiveSessions`, `openSession`) takes
`ctx` and is covered by a `convex-test` integration test instead. "No `ctx` in
the logic" is the rule; "no `ctx` in the file" is not.

### A "state" question is a union, not booleans

Any "which case are we in?" question returns a discriminated union whose
variants carry their payload (`enter` carries `channelId`), so callers narrow
without a re-check. Use string-literal unions, never a TS `enum`
(`verbatimModuleSyntax` + `isolatedModules` rule out `const enum`; the repo has
no enums).

### Layout inside a file: exports first, helpers below

The file reads top-down as what it _does_, then how. The exported function(s)
sit at the top; every helper — auth compare, DB getter, transition resolver —
sits **below the last export**. `bot/service.ts` is the reference:
`recordVoiceEvent` first, then `getStudyTransition`, `getGuildSettings`,
`closeActiveSessions`, `openSession`, `linkUser`, `safeEqual`, `assertBotSecret`.

### Auth checks

Convex has no middleware. The auth check lives in the function that needs it:
`ctx.auth.getUserIdentity()` at the top of the handler (or the service), never a
user id passed in. Reads that should return empty rather than throw say so with
an early `return []` / `return null`. Factor it into `convex/lib/auth.ts`
(`requireUser(ctx)`, `requireBot(ctx, secret)`) only once two domains share it —
do not create it speculatively.

### Convex-specific rules (do not translate away)

- Keep registered functions in the **root `<domain>.ts`**. Moving them into the
  folder renames `api.sessions.listActive` → `api.sessions.queries.listActive`;
  update every caller in the same change.
- `_generated/` is generated — never hand-edit, never hand-write an `api` barrel
  (trikora's `src/api/index.ts` has no Convex equivalent; Convex generates it).
- Bounded reads: `.take(n)` / paginate; `.collect()` only when the caller asked
  for everything.
- Time: `Date.now()` in the I/O half; a pure decision takes `now: number`.

## Testing

Stack: **Vitest + `convex-test` + `@edge-runtime/vm`**, per the repo's Convex
guidelines. Two kinds, two homes:

- **Pure unit test** — `convex/<domain>/service.test.ts`. Imports the exported
  pure helper directly, feeds it plain data, asserts the union. No `ctx`, no DB,
  fast. This is where transition/decision logic is pinned down.
- **Integration test** — `convex/<domain>.test.ts`, at the root so
  `import.meta.glob('./**/*.ts')` sees every module. Uses
  `convexTest(schema, modules)` and calls the registered function through
  `api.*` / `internal.*`; this covers the `ctx`-taking I/O.

```ts
// convex/bot.test.ts
/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

it('opens a session when entering a study channel', async () => {
  const t = convexTest(schema, modules)
  // ... seed guildSettings + env, call api.bot.recordVoiceEvent, assert
})
```

Only the triple-slash reference goes in test files that use `import.meta.glob`;
leave `compilerOptions.types` unset.

Commands: `pnpm test` (root, all packages) / `pnpm --filter @studytrack/backend
test`. Run `pnpm format` and `pnpm test` after every change; `pnpm lint` and
`pnpm typecheck` on request (see `AGENTS.md`).

## Frontend: a web feature (guidance for new work)

`apps/web/src/routes/` holds **only** route files (TanStack file routes). New UI
and logic go in feature folders; the route stays thin. Leave existing inline
`convexQuery(...)` calls (`dashboard.tsx`) alone until you next touch them.

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

Components call a named hook, not an `api.*` path. The hook wraps Convex's own
hook and does **not** invent query keys (Convex owns those, unlike trikora's
React Query layer).

```ts
// features/dashboard/useActiveSessions.ts
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@studytrack/backend/convex/_generated/api'
import { useSuspenseQuery } from '@tanstack/react-query'

export function useActiveSessions() {
  return useSuspenseQuery(convexQuery(api.sessions.listActive, {})).data
}
```

### Types come from the schema

Re-export `Doc<'studySessions'>` / `Infer<typeof validator>` from the domain;
never retype a row by hand. The web `types.ts` is for view models the schema
does not carry (e.g. a formatted duration), not duplicates of it.

## The split checklist

Before adding a file, ask:

1. Is this **wiring** or **logic**? A decision → an exported, pure helper in
   `service.ts`, tested with plain Vitest.
2. Is this **shape**? → a validator in `types.ts` / `schema.ts`, and derive.
3. Is this the **component's view**? → a `use*` hook, then the component.
4. Is the file past ~150 lines, or doing two jobs? → it becomes a folder
   (`index.tsx` + `hooks.ts` + `types.ts` + subcomponents), not a longer file.
5. Is it generated? → leave it alone.

## Rollout: touch-only

Apply the pattern to a domain the **first time you touch it**; do not sweep the
codebase to satisfy it. `bot/`, `sessions/`, `users/`, `guildSettings/` already
match. When you start a second activity type or a camera-on/off signal, the
`StudyTransition` union grows a source/activity dimension — design for it then,
not now.
