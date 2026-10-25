---
id: ST-35
status: todo
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

- [ ] The viewed Day's active plan blocks appear as groups, ordered by start time,
      with title, time and count.
- [ ] Dragging a Task into a group assigns it and persists; dragging it out
      unassigns it; dragging it to another group moves it.
- [ ] Empty groups remain visible and accept a drop.
- [ ] A done Task appears in Done, not in its plan group.
- [ ] Reordering the main queue never changes the order of Tasks inside a group.
- [ ] When a block ends, its group disappears and unfinished Tasks return to the
      main queue; a past block's popover still shows the record.
- [ ] The mobile sheet remains flat with a plan chip.
- [ ] Keyboard and screen-reader drags announce the target group; the existing
      schedule-for-today rail still works.
