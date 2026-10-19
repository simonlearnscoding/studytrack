---
id: LD-3
status: todo
type: requirement
priority: B
area: redesign
---

# Task dots

**In short:** how "done" tasks are marked on a lane — the dot per completed task.

## Owner's thinking

> Just like in the dashboard, finishing a task gets represented with a dot of
> that task. … I will need to get grilled on that.

## Current state

The live adapter marks each completed task with a `TimelineDotVM { leftPx }` — a
pixel position on the axis, drawn as a small outlined circle — and each row carries
`TimelineRowVM.dots: TimelineDotVM[]` (`packages/backend/convex/timeline/types.ts`).
The task itself is `DashboardCompletedTask { id, title, completedAt }`
(`packages/backend/convex/sessions/types.ts`); the `task` table row carries `done` +
`completedAt`. There is no per-task `shared` flag — ADR-0007 makes task content
public.

## Open questions

- [ ] **Size / colour**, and live vs past treatment.
- [ ] Does a dot **identify its task** on hover/tap (title), and is that the hook
      into the [[Past-session popup]]?
- [ ] **Density:** many tasks in an hour collide — cluster, stack, cap, or let them
      overlap?
- [ ] Should **planned** tasks get a dot too, distinct from done ones, or is that a
      plan block ([[Future-session planning]])?
- [ ] Sit the dot **on the bar** or on the empty lane underneath?
- [ ] Every task title is now public (ADR-0007, no `shared` flag) — so does every
      completed task get a dot, or only ones ticked while a session was running?

## Related

- [[Lanes of the day]] · [[Past-session popup]] · [[Future-session planning]]
