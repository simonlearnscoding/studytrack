---
id: ST-31
status: todo
type: requirement
priority: A
area: requirements
---

# ST-31 Plan block title and editable window

#ready-for-agent

**In short:** a plan block gets a name, and its window can be corrected from the
same popover that creates it.

**Blocked by:** None (can start immediately).

## Context

A plan block is the dashed future window on the lane — the vault's old "planned
session". It is an intention, not tracked time (GLOSSARY). Today it is created by
a drag or double-click with no name, and the stored popover can only remove it.
This ticket gives it an identity and one editing surface. The task link is ST-33.

Read ADR-0007 (task content is public) and the GLOSSARY entries for planBlock,
Day and Task.

## What to build

- Creating a plan block from a drag or a double-click opens the draft popover with
  a title input, start, end and total time. The gesture's window pre-fills the
  time fields.
- The title is required and trimmed; an empty title cannot be created.
- Start and end are editable on the 15-minute grain, inside the block's Day,
  never in the past and never overlapping another block. A refused window keeps
  the popover open with an inline reason and writes nothing.
- Total time is derived from start and end. Editing total moves the end, keeping
  the start; editing start or end recomputes total.
- Clicking a stored block opens the same popover. The title is editable at any
  time. Start, end and total are editable only before the block starts; once it
  has started they are read-only.
- The chip above the block on the lane shows the title, truncated. A block with no
  title (written before this ticket) falls back to its time range. The popover
  always shows both title and window.
- Remove is offered only while the block has not started. A live or past block has
  no remove action.
- No task association in this ticket.

## Acceptance criteria

- [ ] Creating a block without a title is refused with a visible reason; a valid
      title is stored and shown on the lane.
- [ ] A legacy block without a title still renders (time-range fallback) and can
      be given a title.
- [ ] Editing an upcoming block's start or end updates the stored window and the
      total; a past, overlapping, off-grain or cross-Day window is refused with an
      inline message and nothing is written.
- [ ] Editing the total moves the end and keeps the start; the displayed total
      stays consistent with the two endpoints.
- [ ] After the block starts, the window fields are read-only but the title can
      still be changed.
- [ ] Remove is offered only before the block starts.
- [ ] The title and window are public on the lane and in the popover (ADR-0007).
- [ ] The create and update mutations reject an empty title and a non-Day start
      without writing.
