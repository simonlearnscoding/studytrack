---
id: ST-34
status: todo
type: requirement
priority: A
area: requirements
---

# ST-34 Plan a block with tasks

#ready-for-agent

**In short:** when creating or editing a plan block, search the member's undone
tasks and pick or create the work for that block.

**Blocked by:** ST-31 (the plan block popover) and ST-33 (the assignment link).

## Context

The create popover is where a plan is born; asking for tasks there is the
shortest path from "I have two hours" to "here is what I mean to do". This ticket
upgrades the simple same-Day picker from ST-33 into a debounced search over every
undone Task, with an explicit create-and-attach path. The create must be atomic:
the block, the new Tasks and every assignment land together or not at all.

Read ADR-0010, ADR-0012 and the GLOSSARY entries for Task, Open, Day and Plan
assignment.

## What to build

- The plan create popover and the stored block popover share one "add planned
  task" search over the member's undone Tasks, across Days. Results are debounced
  (no query per keystroke), capped, and show each Task's current Day.
- Picking an existing Task attaches it. If it belongs to another Day, the attach
  moves its planned Day to the block's Day and appends it to that Day's queue.
- Typing a title that matches no Task offers "create and attach"; on Create (or on
  select, in the stored popover) it creates the Task on the block's Day and
  assigns it in one write.
- In the create popover, the block, new Tasks and assignments are written
  atomically on Create. Cancel writes nothing. The title and the window are
  validated exactly as in ST-31.
- A Task already in another active block moves; a Task already in this block is
  not offered twice. Done Tasks are not offered.
- The picker is keyboard-reachable and announces the selected result.
- The stored popover's task list and the task queue's plan chip update live.

## Acceptance criteria

- [ ] Creating a block with two existing Tasks and one new title stores the block,
      the new Task and all three assignments; Cancel stores none.
- [ ] Search is debounced and never queries on every keystroke; it returns a
      bounded result set with each Task's current Day.
- [ ] Picking a Task from another Day moves it to the block's Day and it appears
      in that Day's queue.
- [ ] "Create and attach" creates the Task on the block's Day and assigns it.
- [ ] Done Tasks are not offered; a Task already in the block is not offered
      twice.
- [ ] The atomic create leaves no orphan block or Task when any part is refused.
- [ ] The picker is usable by keyboard and screen reader.
