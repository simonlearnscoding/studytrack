---
id: ST-35
status: done
type: requirement
priority: B
area: requirements
---

# ST-35 Plan groups in the task view

#ready-for-agent

**In short:** the Day's active plan blocks become groups in the task pane, and
Tasks can be dragged in, out and between them.

**Blocked by:** ST-32 (dev clock) and ST-33 (assignment link).

## Context

The task pane is the member's Day: the main queue plus the Done group. A plan
block is already visible on the timeline, but its Tasks are only in its popover.
This ticket makes the plan visible where the work is arranged. Groups are a view
over assignments: the assignment link is the source of truth, the group is not a
second list.

Read ST-30 (the Done group pattern), ADR-0010 and ADR-0012.

## What to build

- For the viewed Day, every plan block that has not ended renders in the task pane
  as a group, ordered by start time. The heading reuses the Done group's pattern:
  title, time, count and a caret; folding is local to this revision.
- A Task with an active assignment appears in its plan group. Open Tasks with no
  active assignment stay in the main queue. Done Tasks stay in the Done group.
- Drag an unassigned Task into a group to assign it; drag a grouped Task out to
  unassign it; drag it to another group to move it. Dropping a Task into a group
  does not tick it.
- An empty group stays visible as a drop target with a short hint.
- Reordering inside the main queue must not reorder or move Tasks inside a plan
  group. There is no per-group ordering in this ticket; a group lists its Tasks in
  the Day's queue order.
- When a block ends, its group disappears and its unfinished Tasks return to the
  main queue. The past block's popover keeps the record. The change is live.
- The mobile task sheet stays a flat list with the plan chip. Plan groups are a
  desktop-pane feature for now.
- The existing drag-to-reorder and "schedule for today" rail keep working. A Task
  never appears twice.
- Drag announcements name the target group.

## Acceptance criteria

- [x] The viewed Day's active plan blocks appear as groups, ordered by start time,
      with title, time and count.
- [x] Dragging a Task into a group assigns it and persists; dragging it out
      unassigns it; dragging it to another group moves it.
- [x] Empty groups remain visible and accept a drop.
- [x] A done Task appears in Done, not in its plan group.
- [x] Reordering the main queue never changes the order of Tasks inside a group.
- [x] When a block ends, its group disappears and unfinished Tasks return to the
      main queue; a past block's popover still shows the record.
- [x] The mobile sheet remains flat with a plan chip.
- [x] Keyboard and screen-reader drags announce the target group; the existing
      schedule-for-today rail still works.

## Decisions (2026-10-25)

- **Sections:** live plan group → the unassigned queue (no heading) → upcoming
  plan groups by start → Done. A group exists only while `plannedEnd > now`, so a
  past Day shows no plan groups at all. See ADR-0014.
- **Sortable groups:** sorting inside a group permutes that group's tasks among the
  queue slots they already occupy; no per-group order is stored. A cross-section
  drop writes the assignment and the new queue order in one mutation.
- **Done and the count:** a Done task stays in Done. A plan heading shows
  `done/total`; its body lists only Open rows.
- **Now:** the live plan's first Open task, else the unassigned queue's first, else
  the earliest upcoming plan's first. The backend takes the caller's clock so the
  pane, hero and room agree (ADR-0011 amended by ADR-0014).
- **Kept out:** per-group `...` menus, coloured accent stripes, and an
  "Add a task to this session" row.

## Done

`buildPlanSections` projects the one queue order into live group → unassigned →
upcoming groups → Done, with each Task's plan read bounding the assignment to its
window. `PlanGroupSection` is the foldable heading plus a droppable body (empty
bodies say "Drop a task here to plan it"), and `dropActionFor` builds the full
order by moving only the dropped Task between sections, so one drop writes the
assignment and the order together. A group heading shows its count and
`done/total`; Done stays the only home for finished work. Announcements name the
target group, the mobile sheet stays flat with the plan chip, and Now follows
ADR-0014.

Superseded in part by [[ST-37 Add a task inside a plan group]]: the inline "add a
task" row kept out here is now specified there.
