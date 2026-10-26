---
id: ST-33
status: done
type: requirement
priority: A
area: requirements
---

# ST-33 Plan block task assignment

#ready-for-agent

**In short:** a member can put tasks into a plan block from the block's popover,
and a past block keeps the record of what it was meant to contain.

**Blocked by:** ST-31 (the plan block popover this lives in).

## Context

A Task is planned for a Day; a plan block is a window on that Day. The link is a
plan assignment: one row per Task and block, many over time, at most one to a
block that has not ended (ADR-0012). The block's window decides whether the
assignment is upcoming, live or past; no state flag is stored. A completion
instant is known only for a live tick (ADR-0010), so a past block must never
invent one.

Read ADR-0007, ADR-0010, ADR-0012 and the GLOSSARY entries for Task, Open, Done,
Completion, planBlock and Plan assignment.

## What to build

- A plan assignment link between Task and planBlock. One row per Task and block,
  carrying the block's Day so the Day read is one indexed query. No position and
  no state: order belongs to the task queue, state belongs to the block's window.
- A stored plan block's popover lists its assigned tasks and lets the owner add an
  open task from that Day or remove an assigned one. The list is read-only for a
  past block and has no clickable checkboxes.
- At most one assignment to a block that has not ended. Attaching a Task to
  another active block moves it; an assignment to a block that has ended stays as
  the record.
- The plan popover shows each assigned Task as Open or Done, with the completion
  time when one is known. For a past block, show how many were done inside the
  block's window and how many were done outside it. A Done Task with no instant is
  never counted as done inside.
- The task queue shows the Task's current plan (title and window) on the row.
- Deleting an upcoming block removes its assignments and leaves its Tasks on the
  Day. Live and past blocks cannot be deleted.
- A mobile member can open a plan block's popover, so assignment is available
  there too. The mobile task sheet stays flat.
- Remove the dead `plannedWorkSessionId` field, its index and its read branch.
  Work-session popovers keep showing Tasks by completion inside the session.

## Acceptance criteria

- [x] Adding an open Task from the block's Day attaches it and the popover and
      task row update live; removing it detaches it.
- [x] Assigning a Task already in another active block moves it: the old active
      block no longer lists it, the new one does, and an ended block keeps its
      assignment.
- [x] A past block's task list is read-only and offers no checkbox.
- [x] A past block reports its tasks' eventual state and, where known, whether the
      completion fell inside its window; a retrospective completion with no
      instant is never counted inside.
- [x] Deleting an upcoming block leaves its Tasks on the Day; live and past blocks
      have no remove action.
- [x] No code reads or writes `plannedWorkSessionId`; work-session popovers still
      show completed Tasks.
- [x] Ownership is enforced on every write; another member's Task or block never
      leaks its existence.
- [x] A mobile tap on a plan block opens the popover.

## Done

`planAssignment` (owner, Task, block, the block's Day; no position, no state) with
`assign` / `unassign` / `assignNew`, and `getWithTasks` public to signed-in members
with an `isOwner` flag. `assignTask` moves a Task from another Day onto the block's
Day first and drops every assignment to an unended block; an ended one stays as the
record. A plan assignment always points at a Task on the block's Day, so the Day
read is one indexed query (`taskPlansForDay`, newest assignment per Task) and the
row chip disappears once its window closes. The past popover reports
`doneInside` / `doneOutside` / `doneUnknownTime`, and a completion with no instant
is never counted inside (ADR-0010). `plannedWorkSessionId` and its index are gone.
Assignment is owner-only and never offered for a past block; the lane's plan block
is a real button on both breakpoints.

Follow-up: the richer create-and-attach path lives in
[[ST-34 Plan a block with tasks]].
