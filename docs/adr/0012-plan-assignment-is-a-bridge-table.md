# A plan assignment is a bridge table

A Task can be planned into a plan block. Over time the Task may be planned into
many blocks, and a block holds many Tasks, but at most one of those assignments
may point at a block that has not ended. The link is therefore its own table —
one row per Task and plan block — not a field on either side.

A field on the Task (`planBlockId`) would be enough for the next plan, but it
overwrites the past: planning the Task again would erase the record of what the
earlier block held. A list on the plan block duplicates the Task, makes moving it
between blocks a two-row edit, and cannot answer "which blocks was this Task in?"
without scanning every block.

"Upcoming", "live" and "past" are derived from the block's window, never stored
on the assignment: a stored flag would go stale the moment the clock crossed the
block's start.
