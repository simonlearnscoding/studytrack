---
id: ST-38
status: todo
type: requirement
priority: B
area: requirements
---

# ST-38 A plan is a link, not a record

#ready-for-agent

**In short:** a Task's plan becomes one optional field on the Task, plan blocks
stop being frozen at their start, and past blocks stop being an archive with
rules of its own.

**Blocked by:** none.

## Context

Three rules protect a record of past plans: a Task may hold one assignment to a
block that has not ended (ADR-0012), a started block cannot move or be deleted
(ST-31), and an ended block keeps its tasks and reports how many were done
inside its window (ST-33). Every one of them is enforced twice — once in the view,
so a gesture is refused before it is attempted, and once in the mutation.

The record answers nothing the product needs. What actually happened is in
workSessions (ADR-0004); a plan block is an intention. Removing the record lets
the plan be a single field on the Task and lets every block be an ordinary row:
editable, movable, deletable, at any phase.

Read ADR-0015 (which supersedes ADR-0012 and amends ADR-0013 and ADR-0014),
ST-31, ST-33 and ST-35.

## What to build

- **The link is a field.** Add optional `planBlockId` to the `task` table with an
  index by it; delete the `planAssignment` table. Planning a Task sets it,
  unplanning clears it, and nothing else records where it has been.
- **Deleting a block unplans its tasks.** They stay on their Day, at their queue
  positions, and leave the block's group in the same live update.
- **A block is never frozen.** A started or ended block can be moved, resized,
  renamed and deleted. The window stays on its Day, on the grid, and inside the
  Day's bounds; no block may overlap another. The `locked` flag leaves the
  timeline view model, the drag gesture no longer has a refused branch, and the
  cursors and tooltips that announced the lock go with it.
- **Tasks leave a block at any phase.** The pane's drag, the popover's remove
  button and the timeline's task list all work on a live or ended block exactly
  as they do on an upcoming one.
- **No plan accounting.** Delete `countPlanTasks`, `PlanTaskStats`, the `missed`
  flag and the popover's stats line. A past block's popover is the ordinary
  popover, with a delete action.
- **The move to another Day clears the plan.** Picking a Task from another Day
  into a block still moves it to the block's Day (ADR-0013); moving a Task to
  another Day by reschedule clears its plan, because the block stays behind.
- **Groups are unchanged.** The pane still shows live → unassigned → upcoming →
  Done (ADR-0014), and a group still exists only while `plannedEnd > now`.

## Acceptance criteria

- [ ] A Task planned in a block stores one `planBlockId`; planning it elsewhere
      moves it, and unplanning clears the field.
- [ ] Deleting a block clears the field on its tasks and leaves every task on its
      Day at its old position.
- [ ] A started block can be dragged and resized on the timeline, with no
      refusal cursor, tooltip or mutation error.
- [ ] A started or ended block can be deleted from its popover.
- [ ] A task can be added to, removed from or moved out of a block at any phase,
      from the pane and from the timeline popover.
- [ ] The popover has no "done inside / done outside" summary and no read-only
      window state.
- [ ] Rescheduling a planned Task to another Day clears its plan; the target Day's
      queue appends it at the bottom.
- [ ] The Day's task read is still two queries, not one per row.
- [ ] The backfill copies every current assignment into `task.planBlockId` and is
      safe to run twice.

## Decisions

- **One field, no history** (ADR-0015). The bridge table existed to keep the
  record and the multi-block future; both are dropped.
- **Delete means unplan.** A block's tasks are its link, so they cannot outlive
  it as orphans; clearing the field in the same mutation keeps the pane honest
  without a sweep.
- **No "frozen while tracking" compromise.** A phase-dependent write rule is the
  kind that is discovered by surprise; the block is not what is being tracked.
- **Groups keep their phase rule.** A group disappearing when its block ends is a
  view choice about what the pane is for (planning), not a write restriction, so
  it stays.

## Related

- [[ST-31 Plan block title and editable window]]
- [[ST-33 Plan block task assignment]]
- [[ST-35 Plan groups in the task view]]
- [[ST-37 Add a task inside a plan group]]
