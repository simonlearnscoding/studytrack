---
id: ST-27
status: todo
type: requirement
priority: A
area: requirements
---

# ST-27 Task planning and active task

#ready-for-agent

**In short:** make the Day the unit of planning. A task carries `plannedAt` (the
Europe/Zurich Day it is planned for) and optionally the Session it was planned
into. The dashboard reads the selected Day's tasks, oldest first, so a new task lands at the bottom. One active task
lives on the member's user row. A completion binds to the Session it happened in.
Backend contract first; the beta UI follows.

## Problem Statement

The redesigned dashboard's task list is a mock. Adding, ticking, renaming,
deleting, choosing NOW and the up-next suggestion all live in component state, so
a reload loses them and nothing is shared with the backend.

The stored task model only knows the day a task was **created**, not the day it is
**planned for**. The calendar lets a member browse another Day, but the task list
cannot follow it and there is no way to plan work for another Day.

There is also no persisted active task. The beta's NOW state is local, so it
vanishes on reload and the room has nothing to read. Finally, the only Session
attribution that exists is completion time: a task finished during a Session is
shown there, but a task **planned** into a Session has no representation at all.

## Solution

A Day, a Session and the active task become first-class parts of a Task.

- A task is planned for a Day (`plannedAt`). Creating a task while viewing a Day
  plans it for that Day. The list for a Day shows exactly the tasks planned for
  it, oldest first; the task just added sits at the bottom.
- A task may be planned into a Session. That link is explicit, not inferred from
  time. A Session shows a task once: as planned if it was planned there, as
  finished if it was completed while that Session was running, or as one row with
  both states when both are true.
- A member has at most one active task, stored on their user row with the instant
  it became active. It survives reloads and clears when completed, deleted, or
  explicitly cleared — never as a side effect of adding or completing other work.
- The up-next suggestion stays derived: the first Open task below the active one,
  or the first Open task when none is active. It never auto-starts.

This ticket ships the backend contract (schema, functions, and the Session read).
Wiring the beta dashboard to it is the next slice. The old `/` dashboard keeps
working by passing today's Day, until it is retired.

## User Stories

1. As a member, I want a task I add while viewing a Day to be planned for that Day, so that I can add work to today or plan ahead for another Day.
2. As a member, I want a Day's list to show only the tasks planned for it, so that browsing the calendar shows the plan for that Day.
3. As a member, I want a newly added task at the bottom of the list, so that planning does not reorder existing work.
4. As a member, I want the list to stay put when I add one, so that the list reads oldest first.
5. As a member, I want the list to update live, so that adding or ticking a task is instant.
6. As a member, I want an empty Day to look empty, so that I can tell "nothing planned" apart from lost data.
7. As a member, I want to rename or delete a task from any Day, so that a mistake never lives on.
8. As a member, I want an empty title rejected, so that blank rows never appear.
9. As a member, I want to mark a task Done, so that I can see progress.
10. As a member, I want to reopen a Done task, so that Done is not a one-way door.
11. As a member, I want a Done task to keep the instant I finished it, so that the Day still tells the story.
12. As a member, I want a Done task to stay on the Day it was planned for, so that completing it does not move it.
13. As a member, I want an unfinished task to stay on its planned Day, so that yesterday's plan does not silently appear on today.
14. As a member, I want to browse a past Day and see the tasks I planned then, so that history is honest.
15. As a member, I want to browse a future Day and see what I planned, so that planning ahead is visible.
16. As a member, I want one active task, so that the room and I know what I am on right now.
17. As a member, I want the active task to survive a reload, so that NOW is not lost.
18. As a member, I want to clear the active task explicitly, so that a stray tap never drops it.
19. As a member, I want completing the active task to clear it, so that I am not shown as working on something finished.
20. As a member, I want completing another task to leave my active task alone, so that ticking side work does not lose my focus.
21. As a member, I want adding a task to leave my active task alone, so that planning does not hijack focus.
22. As a member, I want to set an active task from any Day's list, so that I can pick up an older plan.
23. As a member, I want the active task not to be pinned, so that the list keeps its oldest-first order.
24. As a member, I want the up-next suggestion to be the first Open task below the active one, so that the queue reads top-down.
25. As a member, I want the up-next suggestion to be the first Open task when nothing is active, so that I always have a first step.
26. As a member, I want the up-next suggestion never to become active by itself, so that finishing one task does not silently start another.
27. As a member, I want to plan a task into a Session, so that the Session shows what I intend to do. (later)
28. As a member, I want a task planned in one Session and finished in another to show in both, so that the plan and the outcome are both recorded.
29. As a member, I want that task to show as planned and not checked in the Session where I planned it, so that the outcome does not rewrite the plan.
30. As a member, I want the same task to show as finished in the Session where I completed it, so that the Session records what got done.
31. As a member, I want a task planned and finished in the same Session to appear once, with both states, so that the Session does not duplicate it.
32. As a member, I want a task finished outside any Session not to appear in one, so that Session attribution stays honest.
33. As a member, I want reopening a task to remove it from the finished set, so that a correction is reflected.
34. As a member, I want only I can create, change, complete or delete my tasks and my active pointer, so that nobody else can act as me.
35. As the room, I want to read members' active tasks later, so that presence carries intent. (later)
36. As the room, I want task content to stay public, so that the active task and up-next can be shown without a privacy decision per row. (ADR-0007)
37. As a maintainer, I want one read contract for "a member's tasks for a Day", so that every surface agrees on what that Day contains.
38. As a maintainer, I want the Day to come from the caller, so that queries never read the wall clock and stay deterministic.
39. As a maintainer, I want the Session payload to carry planned and finished task references once, deduped, so that no surface has to guess.
40. As a maintainer, I want the old `/` dashboard to keep working by passing today's Day, so that retiring it is not a prerequisite.
41. As a maintainer, I want the schema to support carry-over and re-planning later without a rewrite, so that the open mechanic does not block this work.

## Implementation Decisions

**Vocabulary.** A _Day_ is a Europe/Zurich calendar day. A _Session_ is the real
voice sitting (ADR-0004); a Planned session is a different thing and is not part
of this model. A task's `plannedSessionId` points at a real Session. The field is
"planned in this Session", not "this is a Planned session".

**Schema shape (decision-rich):**

```text
task:
  userId            Id<'users'>        required
  title             string             required
  done              boolean            required
  completedAt       number?            set on Done, cleared on reopen
  plannedAt         number             required, Europe/Zurich day start
  plannedSessionId  Id<'session'>?     optional, the Session it was planned into
  indexes:
    by_userId                  (userId)
    by_userId_plannedAt        (userId, plannedAt)
    by_userId_completedAt      (userId, completedAt)
    by_plannedSessionId        (plannedSessionId)

users:
  activeTaskId      Id<'task'>?        optional
  activeSince       number?            set with the pointer
```

- **No `createdAt` field.** `_creationTime` remains the creation instant and the
  creation-order sort key.
- **`plannedAt` is a day, not a time.** It is always the Europe/Zurich midnight of
  the planned Day. Fetch is an exact-day read, not a range over arbitrary
  timestamps.
- **`completedAt` stays the completion instant** and remains the key that binds a
  finished task to the Session whose span contains it. It is not a plan time.
- **`plannedSessionId` is an explicit link.** It is set only with `plannedAt` in
  the same mutation, and the Session must belong to the caller. The write path is
  the future planning/carry-over mutation; no UI ships in this ticket.
- **`by_plannedSessionId` is for a direct "planned in this Session" read.** The
  Today read can use the Day's tasks instead, because planning a task into a
  Session writes the Session's Day to `plannedAt`; the index keeps a future
  per-Session read cheap.
- **Two indexed reads replace the old bounded scan.** The Session read currently
  scans a member's newest tasks and filters completions. That misses an old task
  completed today and could miss an old task planned into today's Session. The new
  read uses `by_userId_plannedAt` for the Day's tasks and `by_userId_completedAt`
  for the Day's completions (new index), then binds both to Sessions.

**Day read.** `listMine({ dayStart })` authenticates, returns exactly the
caller's tasks where `plannedAt === dayStart`, oldest first by `_creationTime`,
bounded. The read is newest-first so the cap keeps recent tasks, then reversed. The view type carries `id`, `title`, `done`, `completedAt`,
`plannedAt`, `plannedSessionId`. Unauthenticated callers get an empty list.
The Day is supplied by the caller; the query never reads the wall clock.

**Create.** `create({ title, plannedAt })` authenticates, trims, rejects an empty
title, and inserts an Open task with that `plannedAt`. The client computes the
Day start with the shared Europe/Zurich helper. The old `/` dashboard passes
today; the beta passes the selected Day. The server does not infer the Day from
the wall clock.

**Active task.** The pointer lives on `users` (`activeTaskId`, `activeSince`), not
on the task. `setActive({ taskId })` requires an owned, Open task and sets both
fields (keeping `activeSince` if that task was already active). `clearActive()`
removes both and is idempotent. `getActive()` returns `{ task, activeSince }` or
`null`; it returns `null` if the pointer is missing or points at a missing task.

**Active lifecycle.** Clearing the active task happens when:

- the active task is completed (`toggle` to Done), or
- the active task is deleted, or
- `clearActive` is called.

Creating a task does not touch it. Completing a different task does not touch it.
Reopening the task that was active does not make it active again.

Active is **user-level, not Session-scoped** in this slice. ST-24's "leaving a
Session clears it" rule is deferred until real tracking exists; the backend does
not enforce it. A task from any Day may be set active.

**Ordering and next.** The Day list is oldest first, so a newly added task lands
at the bottom; the active task is not pinned. Up-next is derived, never stored:
the first Open task below the active row, or the first Open task when nothing is
active. This keeps ST-24's oldest-first order and its "first open below"
definition.

**Session payload.** `DashboardSession.tasks` becomes a deduped union of
planned-in-this-Session and finished-in-this-Session entries. Type shape:

```text
DashboardSessionTask = {
  id: Id<'task'>
  title: string
  planned: boolean           // plannedSessionId === this Session
  completedAt: number | null // set only when finished inside this Session
}
```

- A task planned in Session A and finished in Session B yields one entry in A
  (`planned: true`, `completedAt: null`) and one in B (`planned: false`,
  `completedAt: <instant>`), unless it was also planned in B, in which case B's
  entry is planned and finished. That is the intended "both Sessions" behaviour.
- A task planned and finished in the same Session yields **one** entry
  (`planned: true`, `completedAt: <instant>`), never two.
- A task finished in a gap between Sessions is attributed to none.
- A task finished outside any Session is not attributed to a Session.
- The session-scoped `completedAt` is `null` for a planned-only entry even if the
  task is Done elsewhere. The Session shows what that Session planned and did,
  not the task's global state.
- Ordering: planned entries first in task creation order (oldest first), then
  finished-only entries by `completedAt` ascending.
- The timeline dot builder uses only entries with a non-null `completedAt`;
  planned-only entries are not dots. The web dot builder is updated to filter,
  so there is no visual change. No other consumer reads `session.tasks` today.

**Reads are indexed and bounded.** The Session read fetches, per member:

- the Day's tasks by `by_userId_plannedAt`, and
- the Day's completions by `by_userId_completedAt` in the Day window,

then builds each Session's union with a pure helper. A Day with more tasks or
completions than the cap is still bounded, never an unbounded scan.

**Ownership and auth.** Every function resolves the Clerk identity to the user
via the existing auth path. A task is readable/writable only by its owner; missing
and someone else's tasks share the same "not found" error so existence never
leaks. The active pointer is written only by its owner. Task content remains
public per ADR-0007; this ticket does not add a room read.

**Migration.** `plannedAt` is required. Existing rows are dev/test data; reset
them. If any real rows exist, a one-off backfill sets `plannedAt` to the
Europe/Zurich day of `_creationTime`. `plannedSessionId` stays absent. No other
field is added.

**Docs.** The vault data-model note is stale (it still says task content is
private and that only counts are shared); update it with the new fields, indexes,
and the active pointer. ADR-0007 remains the visibility decision.

## Testing Decisions

A good test asserts **external behaviour**: given seeded users, Sessions and
tasks, what the caller's Day list, active task and Session task refs contain —
never internal function calls or raw row shapes beyond the model.

**One high seam: the Convex function boundary**, via `convex-test`, following the
existing tasks and sessions tests. It covers:

- auth rejection and cross-user ownership on every write;
- create stamps the given `plannedAt` and rejects an empty title;
- `listMine` returns exactly the selected Day, oldest first, excludes other Days,
  and is bounded;
- toggle stamps and clears `completedAt`, and clears the active pointer only when
  the completed task is the active one;
- set/clear/get active: ownership, Open-only, persistence, delete clears,
  create and completing other tasks do not;
- the old `/` path (passing today's Day) still returns today's plan.

**One pure-helper seam for the non-trivial rules**, tested with plain Vitest:

- up-next: active present / none, first Open below, no wrap, first Open fallback;
- Session union/dedup: planned only, finished only, both in one Session, planned
  in A and finished in B, finished in a gap, reopened after completion.

The existing `attachTasksToSessions` tests grow into the union tests; the existing
task tests migrate their fixtures to set `plannedAt` rather than being duplicated.

## Out of Scope

- **Wiring the beta task pane/dock to these functions.** That is the next slice:
  the composer, day selection, NOW/NEXT, and the mobile dock.
- **The write path for `plannedSessionId`** (drag a task into a Session, planned
  Sessions, tap-to-plan). The schema supports it; no mutation or UI here.
- **Carry-over and re-planning UX.** Manual move from a past Day, slip history,
  and the "carried over" mark are still open; see the quick note.
- **Automatic carry-over.** An unfinished task does not appear on today
  automatically.
- **Room-side active task and per-member counts.**
- **Session-scoped clearing of active** when tracking ends.
- **Deployment, production data migration, and the old dashboard's retirement.**
- **Calendar month navigation, heat, and the timeline following the focus Day.**

## Further Notes

- **Supersedes parts of [[ST-24 Active task and next suggestion]]:** the active task
  lives on the user (not the task), it clears on completion, and Session-scoped
  clearing is deferred. Its oldest-first order, derived up-next, one-state model,
  and explicit clear stay.
- **Supersedes the "created today" scoping in the [[Tasks spec]] (ST-10):** reads are
  by `plannedAt`, not creation time.
- **Open mechanic:** the carry-over/re-planning discussion lives in
  [[Tasks — planning mechanics to decide]].
- **Future room read:** with the active pointer on `users`, a room read can join
  users → active task without a schema change.
- **Visibility:** ADR-0007 governs; there is no per-task privacy flag.
