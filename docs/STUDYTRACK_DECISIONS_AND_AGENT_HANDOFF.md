# Planning, completion and sessions — decisions & handoff

Product intent and handoff notes, 2026-10-24. **Not a spec.** Verify the code
before changing it; treat anything under "Open" as undecided.

> Naming: earlier discussions said `plannedSession` / `session` /
> `sessionPartial`. The code now says **`planBlock`** (intention),
> **`workSession`** (what actually happened) and **`workSessionPartial`**. This
> note uses the current names.

## Decided (product intent)

- **A day is a fresh context.** Yesterday's unfinished tasks do not leak into
  today. Carry-forward is optional, never a ritual.
- **A task is a persistent identity.** Moving it to another day or plan does not
  duplicate it.
- **A plan is historical evidence of intention.** Moving or rearranging is fine
  before the planned block starts. Afterwards the original record stays;
  corrections are explicit.
- **Planning is not doing.** A task can be planned for one block and completed
  in a different tracked session.
- **Completion may have no known instant.** `done: true` must not invent a
  timeline dot. Store *when the box was pressed* separately from *when the work
  happened*, which may be unknown.
- **Evidence stays distinct.** Planned blocks, tracked intervals and timed
  completions are different facts and must not share a visual grammar.
- **Keep the UI simple over a richer model.** Default interactions fast;
  corrections in details/popovers.
- Today's live tracking is independent of the historical day being browsed.

## Current code, verified 2026-10-24

- `task.toggleTask` **always stamps `completedAt = Date.now()`**
  (`packages/backend/convex/tasks/service.ts:127`), including retrospective
  completion. The timeline then binds that instant to whichever `workSession`
  contains it (`workSessions/util.ts:47`). This is the historical-dot bug.
- `planBlock` is a future window with no title and **no link to tasks**
  (`schema.ts:113`). A task can be planned for a **Day**, not for a plan block.
- `task.plannedWorkSessionId` targets a real **`workSession`**, not a
  `planBlock`. Nothing writes it; tests and `workSessions/util.ts` read it.
  It cannot be reused for plan attachment.
- `workSession` has **no explicit `source`**. Manual vs Discord is inferred from
  the active partial's `mode` (`tracking/service.ts`).
- Lifecycle guards exist in places (manual start rejects double tracking; stale
  partials auto-close after 8h), but there is no single invariant layer.
- **Already shipped:** foldable `Done · N` with `preference.isDoneFolded`
  (desktop + mobile); Now derived from the first open task (header, pane and
  mobile agree); month calendar uses the caller's own `dailyTotal`; plan
  creation requires confirmation; calendar sits above the task list and folds
  to the focus week.
- Desktop hero has **Start tracking** but no **Stop tracking**; mobile has both.

## Ordered next slices

1. **Historical completion must not create a today dot.** Completing a task
   while viewing a past day (or bulk-completing in retrospect) must leave
   `completedAt` absent, or record `recordedAt` without a completion instant.
   A live completion in today's workflow may still get `now`. Do not key the
   rule on `plannedAt === today` alone. Needs tests around open/toggle/reopen,
   today vs past day, bulk, and a task finished inside a tracked session.
2. **Desktop Stop tracking.** The backend mutation exists
   (`tracking.stopManual`); the desktop hero only renders the running clock.
   Show a discoverable Stop while a manual session is active.
3. **Plan block title + one edit popover.** Add optional title to `planBlock`;
   edit start/end and title through the same popover used to create. A soft lock
   (free before planned start, explicit "edit original" after) still needs a
   decision.
4. **Task → planBlock assignment.** The real model gap. Needs the read-only
   audit before any migration: who reads plans, tasks, completions and totals,
   and which queries justify which indexes.
5. **Explicit tracking source + lifecycle invariants.** `source: 'manual' |
   'discord'` with legacy fallback; validate `active ⇒ no endedAt`,
   `ended ⇒ endedAt > startedAt`, and close child partials with the parent.
   Also audit `workSessionPartial.durationMs` (derivable?) and midnight overlap.

## Model direction (agreed direction, not approved)

```
task                 identity, owner, title, done, optional completedAt,
                     optional recordedAt
  1 ─── many
planAssignment       taskId, dayStart, optional planBlockId, position, history
  many ─── 0..1
planBlock            userId, dayStart, plannedStart, plannedEnd, optional title
```

- Completion association is independent of planning association.
- Keep completion on `task` for now; introduce a completion event table only if
  a concrete requirement forces it.
- `sessionPlanSegment` (session ↔ planBlock attribution intervals) is **parked**
  until "does a person explicitly choose a plan?" is answered yes.

## Open decisions (answer one at a time)

1. **Now**: global active task, per-Day topmost open task, or suggestion?
2. **Bulk completion today**: no timed dots by default? What override?
3. **Completed-during-plan**: completion inside the planned interval, or
   explicit work-session attribution? What about unknown completion time?
4. **Plan lock**: what stays editable after the planned start?
5. **Future plans per task**: one upcoming assignment or several?
6. **Carry-forward**: show a "carried over" mark or keep yesterday silent?
7. **Source transitions**: manual → Discord, disconnect/reconnect, pauses,
   midnight; which time is counted once when both overlap?
8. **Time totals**: study / total / deep focus for combined camera + screen
   share, breaks and edits.
9. **Privacy**: which task titles, plans and completions other members see.
10. **Infinite timeline**: query and viewport model.

## Handoff protocol

- One agent run = one slice. Read-only first for anything touching the schema.
- The agent must cite `file:line` for current behaviour, separate confirmed bugs
  from hypotheses, and **stop and report** if the schema makes the change unsafe.
- Never let a "small fix" change what a session or a completion means.
- Tests before destructive migrations; migrations backward-compatible.
- Update this file when a decision is made; do not let an agent invent product
  rules.

## Parked (do not start)

Start working on a plan block · plan-attribution segments · progress bars on
planned blocks · Discord planning reminders · public plans/privacy surfaces ·
Sunsama-style Kanban · infinite horizontal timeline.
