# Planning into a block moves the Task to that Day

A plan block is a window on one Day, and a Task is planned for one Day. Picking a
Task from another Day into a block therefore moves the Task: it leaves the old
Day's queue and is appended to the block's Day. Attaching it without moving it
would leave "in this plan" and "planned for this Day" disagreeing, and the task
queue would show a Task on a Day its block does not belong to.

The move drops the Task's assignments to blocks that have not ended, because a
Task may sit in only one of those (ADR-0012). Assignments to ended blocks stay:
they are the record of what was intended, even after the Task has moved on.

## Considered and rejected

- **Allow an assignment across Days without moving the Task.** It keeps the
  Task's original Day but makes the two reads of "plan" disagree, and the
  assignment row would need to carry a Day separate from its block's.
- **Only offer Tasks from the block's Day.** The plan popover is where a member
  decides what the window is for; hiding the rest of their open list defeats the
  search (ST-34).
