---
id: ST-10
status: todo
type: requirement
priority: B
area: requirements
---

# Tasks spec

#ready-for-agent

Elaborates the task stories (11–16) of [[Studytrack dashboard spec]]. Implemented
by [[ST-5 Tasks]] (core) and [[ST-6 Task visibility]]. Vocabulary follows
GLOSSARY.md; visibility decided by `docs/adr/0002`.

## Problem Statement

The dashboard shows how much study **time** each member logs, but nothing about
what they intend to get **done**. There is no place to plan a session, no way to
tick work off, and no signal connecting effort to output — so the board measures
presence but not progress.

## Solution

Every member gets a **private task list** in the self rail: add a Task, mark it
Done, reopen it. Only the owner sees the titles. Later (ST-6), the room is shown
each member's Open/Done **counts** and a marker on the timeline at each
completion, so the group keeps each other honest without exposing what anyone
studies.

## User Stories

1. As a member, I want to add a task with just a title, so that planning my session is one keystroke.
2. As a member, I want my task list in the self rail beside my tracker, so that my plan and my timer live together.
3. As a member, I want to mark a task Done, so that I can see progress.
4. As a member, I want to reopen a task I marked Done by mistake, so that Done is not a one-way door.
5. As a member, I want a Done task to remember **when** I finished it, so that completions can be placed on today's timeline.
6. As a member, I want to see my own "N done · M open" for today, so that I know what is left.
7. As a member, I want my task titles to be private to me, so that I am not judged on what I study.
8. As a member, I want the room to see only my counts, so that the group keeps each other honest without reading my list.
9. As a member, I want only today's tasks in view, so that the list stays about the session I am in.
10. As a member, I want my tasks from earlier days to be kept, so that nothing is lost when the day rolls over.
11. As a member, I want an empty list to invite me to add my first task, so that I am not staring at a blank box.
12. As a member, I want an empty title rejected, so that accidental blank rows never appear.
13. As a member, I want to see a member's task count on their roster row (ST-6), so that effort and output sit together.
14. As a member, I want a marker on the timeline where a task was completed (ST-6), so that I can connect a stretch of study to what it produced.
15. As a member, I want to hover a marker to see which task was finished (ST-6), so that the timeline tells a story.
16. As a member, I want my task list to update live, so that ticking one off is instant.
17. As a member, I want the board to keep working when the network is slow, so that a failed add never loses the title I typed.
18. As a member, I want to be the only one who can change my tasks, so that nobody else can complete or reopen my work.
19. As a member with a long list, I want it bounded and quick, so that the rail never stalls.
20. As a member, I want edit and delete documented for later, so that a future version can fix mistakes.

## Implementation Decisions

- **New `task` table**: `title` (string), `done` (boolean), `completedAt`
  (optional number), owner `userId`. Creation time comes from `_creationTime`.
  Indexed by `userId`. `completedAt` is set when the task becomes Done and cleared
  when it returns to Open.
- **New `tasks` domain** following `.agents/skills/domain-workflow`: a thin
  `tasks` entry (registered `listMine` query, `create` and `toggle` mutations), a
  `tasks/service.ts` with the auth + db work, and `tasks/types.ts` for the arg
  validators and the owner-facing `Task` view type.
- **Auth + ownership** in every function: the caller's identity resolves to their
  `users` row; `create` writes under it, `toggle` refuses a task that is not the
  caller's (same "not found" error, so existence never leaks), and `listMine`
  only ever returns the caller's own tasks.
- **Today-scoping**: `listMine` takes `dayStart` (the shared Europe/Zurich day
  boundary) and returns only tasks created at or after it, newest first — the
  query never reads the wall clock. Older tasks remain stored but out of view.
- **Bounded reads**: the list is capped, never an unbounded scan.
- **Done is reversible**: toggling Open→Done stamps `completedAt`; Done→Open
  clears it. There is no separate "complete" operation.
- **Edit and delete are documented, not built**: a later version may rename a task
  and delete an Open or Done one.

## Testing Decisions

- Test **external behaviour only**: given a sequence of create/toggle calls and an
  identity, what the caller's list looks like and what the stored task holds —
  never internal function calls.
- **One seam**: the Convex function boundary (`api.tasks.*`) via `convex-test`,
  the highest point and the same seam as `sessions.test.ts` and `tracking.test.ts`.
  It covers auth rejection, ownership privacy, today-scoping, empty-title
  rejection, and `completedAt` being set then cleared.
- No separate pure-helper seam: the toggle transition is trivial, so a unit test
  would only mirror the integration one. If a non-trivial decision appears while
  building (e.g. the today-filter), it moves to `tasks/util.ts` with plain Vitest.

## Out of Scope

- Editing a task's title; deleting tasks (Open or Done) — documented, deferred.
- The backlog view: older, not-today tasks.
- Room task counts and timeline markers ([[ST-6 Task visibility]]).
- The Deep-focus leaderboard, streaks and heatmaps (ST-7/ST-8).
- Task due dates, assignment, and auto-moderation.

## Further Notes

- Counts public / content private is decided in `docs/adr/0002`.
- The "who appears in the room's counts" rule is deliberately unsettled and lives
  in ST-6 with an `#needs-info` tag; it is not assumed here.
