# Plan groups are projections of the Day queue

The task pane shows the Day's not-ended plan blocks as foldable groups without
introducing a second ordering. A Task still has one place in the Day: its
`position` in the queue. A group is a filtered view of that order, so a Task can
be in at most one section and no list has to be reconciled with another.

This keeps ST-35 small: assignments already exist (ADR-0012) and the group is
derived from the task's current plan. Sorting inside a group permutes that
group's tasks among the queue slots they already occupy; it moves nothing in the
other groups or in the unassigned queue. Dropping a Task across a section
boundary also writes the plan assignment, in the same mutation as the new order,
so a failed reorder cannot leave a Task assigned in the wrong place.

## Sections and the clock

The pane reads top to bottom as:

1. the live plan block, if one is running;
2. the unassigned queue, with no heading;
3. the upcoming plan blocks, ordered by start;
4. Done.

A plan group exists only while `plannedEnd > now`. A block that has ended — today
or on a past Day — has no group; its incomplete Tasks fall back to the unassigned
queue and its popover keeps the record. The task lane is for planning, not for
reviewing. The mobile sheet stays a flat list with the plan chip.

## Now

With groups, "the first Open task of the queue" is no longer enough: the pane's
first section and the queue's first slot can disagree. Now therefore leads with
the live plan:

1. the first Open task of the live plan block;
2. otherwise the first Open task with no active plan;
3. otherwise the first Open task of the earliest upcoming plan.

A Task whose latest plan has ended counts as unscheduled; it is not in a group.
Reordering inside the live group changes Now, and entering a plan window changes
Now automatically. The rule is derived, never stored, and both the room and the
pane use it. Because a query may not read the wall clock, `tasks.getNow` and the
dashboard read take the caller's clock as an argument.

## Done and the heading count

A Done Task stays in Done; it never appears in its plan group as well. A plan
heading shows progress as `done/total` — the Done rows assigned to that block
count toward the total even though the group body lists only Open rows. This
keeps Done as the one home for completed work and makes "the group disappears
when the block ends" clean.

## Considered and rejected

- **A per-group order on `planAssignment`.** It duplicates the ordering problem
  and needs a second reorder mutation just to answer "what do I do first here?"
  The queue already answers that; the group is a projection.
- **Showing ended groups as history.** The timeline popover is the record.
  Rendering a group for a block that has ended would mix planning and review.
- **Keeping Done rows inside their plan group.** It makes Done incomplete and
  duplicates the task across sections.
- **Defining Now from the visual section order without a clock.** The section
  order changes when a block starts or ends; a stored position cannot follow it
  without a write on read.
