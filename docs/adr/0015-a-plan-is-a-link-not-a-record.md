> **Supersedes ADR-0012. Amends ADR-0013 and ADR-0014 (2026-11-16):** a Task's
> plan is one optional field on the Task, a plan block is never frozen, and a
> block keeps no record of what it held.

# A plan is a link, not a record

A Task may be planned inside one plan block, and that is the whole of the link:
an optional `planBlockId` on the task row. Planning the Task again overwrites it.
Unplanning clears it. No other row remembers where it used to be.

Three rules used to protect a record of plans:

1. a Task could hold at most one assignment to a block that had not ended, and
   rows for ended blocks stayed forever (ADR-0012);
2. a block that had started could not change its window, and could not be
   deleted (ST-31);
3. a block that had ended kept its tasks: it would not give one up, and its
   popover summarised how many were done inside its window.

Each rule cost a check on every write path, a derived flag the view had to read
to refuse a gesture before the mutation refused it, and tests that pinned the
refusal. None of them were read. The record answered one question — "what did
this block hold?" — and no member asked it twice: the block is on the timeline,
where it was, and the work actually done is in workSessions (ADR-0004).

## What replaces it

- **The plan is a field.** `task.planBlockId` is optional and holds at most one
  block, ever. The `planAssignment` table, its three indexes, and the
  "newest assignment wins" read are deleted.
- **A block is never frozen.** Its window is editable at any phase, it can be
  deleted at any phase, and tasks enter and leave it at any phase. The timeline's
  `locked` flag, the gesture branch that turns a locked press into a click, the
  `cursor-not-allowed` treatment, and the mutation refusals all go.
- **Deleting a block unplans its tasks.** The tasks stay on their Day in their
  queue positions; the field is cleared in the same transaction.
- **No after-the-fact accounting.** No `missed` flag, no `doneInside` /
  `doneOutside` split, no stats line in the popover. A past block's popover is
  the same popover as an upcoming one, listing the tasks it now holds.
- **ADR-0013 stays.** A Task is planned for one Day and a block belongs to one
  Day, so picking a Task from another Day moves it to the block's Day. The move
  now clears the Task's plan outright instead of deciding which assignment rows
  survive.
- **ADR-0014 stays as written.** Groups are still projections of the one queue
  order. With one field per Task, "a Task belongs to at most one section" is
  structural rather than a rule.

## Considered and rejected

- **Keep the table, drop only the uniqueness rule.** A Task in several blocks
  needs an answer to "which plan is this row?", and the queue projection depends
  on a Task having one. It would add rules, not remove them.
- **Keep the table with one row per Task.** That is a field stored sideways: one
  more query per Day read, plus the rule that keeps it to one row.
- **Keep the past-block stats as display only.** They exist to defend the record;
  with the record gone they summarise a block whose contents nobody preserved
  through a delete, so the number would be a lie rather than a simplification.
- **Freeze only while a session is tracking.** A rule that switches on with the
  clock is the one people hit by accident, and the block is not the thing being
  tracked.

## Consequences

- `readDayTaskPlans` becomes a map of the Day's blocks keyed by id; the task rows
  carry the link. `dropUnendedAssignments`, `taskAssignments` and
  `MAX_ASSIGNMENTS_PER_TASK` are deleted.
- The plan popover gains a delete action at every phase and loses its read-only
  window state and its past-block summary.
- A plan block that is deleted while its window is live stops the header's
  countdown, which falls back to the next block or to nothing.
- The record of a Day's intentions is the block itself while it exists and
  nothing after it is deleted. That is the trade: the app keeps evidence
  (workSessions) and intentions (blocks) apart, and never dresses one as the
  other.

## Migration

The table holds the current plan of every Task, so the field must be filled
before the table is dropped:

1. ship the field and the backfill (`migrations.backfillTaskPlanBlockId`) with
   `planAssignment` still in the schema;
2. run the backfill on prod;
3. ship the removal of the table.

The backfill copies each Task's not-yet-ended assignment, or else its newest one,
and is idempotent.
