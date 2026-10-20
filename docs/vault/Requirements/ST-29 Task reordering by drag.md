---
id: ST-29
status: in-review
type: requirement
priority: B
area: requirements
---

# ST-29 Task reordering by drag

#ready-for-agent

**In short:** a member drags a task row up or down in the beta task pane and the
order sticks — per Day, on every device, across reloads. The drag is the first
slice of the "drag a task somewhere meaningful" story: reorder only, inside one
Day's list. Nothing else about a task moves yet.

## Problem Statement

The order of a Day's task list is not a choice. It is whatever order the rows
were created in (`_creationTime`), so the only way to say "this first, then that"
is to add the tasks in the right sequence — and there is no way to change your
mind. A list that is a plan reads as an accident.

Nothing in the app drags. The timeline already has a hand-rolled pointer drag for
planned-session blocks, so there is one drag language in the product and one
surface that cannot speak it.

## Solution

The beta task pane becomes a sortable list. Press anywhere on a row, move 8px,
and the row lifts into a floating card that follows the pointer while the other
rows open a gap. Release, and the new order is saved.

- Order is **per Day**, contiguous, and survives reload and every device.
- A newly added task still lands at the bottom, as it does today.
- Done tasks keep their slot; ticking one does not reorder anything.
- The current Day is the scope: a drag never moves a task to another Day.
- The drop is painted immediately (optimistic), so there is no snap-back while
  the mutation round-trips.

Keyboard and screen-reader users get the same operation: Space lifts, arrows
move, Space drops, Escape cancels.

## User Stories

1. As a member, I want to drag a task row up or down, so that the list matches the order I intend to work in.
2. As a member, I want the order to survive a reload, so that arranging the list is not wasted work.
3. As a member, I want the order to be the same on every device, so that my plan is my plan everywhere.
4. As a member, I want the dragged row to lift into a floating card, so that I can see what I am holding.
5. As a member, I want the other rows to open a gap as I drag, so that I can predict where the row will land.
6. As a member, I want the drop to be instant, so that the list does not visibly snap back while saving.
7. As a member, I want the drag to start only after I actually move the pointer, so that a plain click still clicks a button.
8. As a member, I want the action icons (play, rename, delete) to take precedence over the drag, so that I never delete a task by accident.
9. As a member, I want the cursor to say the row can be grabbed, so that the affordance is visible before I try.
10. As a member, I want to drag a row while the list is scrolled, so that long lists reorder without scrolling back up.
11. As a member, I want a newly added task to land at the bottom, so that planning does not reorder existing work.
12. As a member, I want ticking a task Done to leave its position alone, so that completing side work does not shuffle the list.
13. As a member, I want the list order to be per Day, so that arranging today does not touch tomorrow.
14. As a member, I want to drag on a past or future Day, so that planning ahead works the same as planning today.
15. As a member, I want a drag never to move a task to another Day, so that reordering cannot silently re-plan work.
16. As a member, I want the NEXT badge to follow the new order, so that the suggestion reflects the list I just arranged. (It already does; no new rule.)
17. As a member, I want my active (NOW) task to stay active when I reorder, so that arranging the list does not drop my focus.
18. As a keyboard user, I want to focus a task row and lift it with Space, so that reordering is possible without a pointer.
19. As a keyboard user, I want to move a lifted row with the arrow keys, so that I can choose a precise slot.
20. As a keyboard user, I want to drop with Space and cancel with Escape, so that a mis-lift is recoverable.
21. As a screen-reader user, I want to hear which task I picked up and where it moved, so that the manipulation is not silent.
22. As a screen-reader user, I want short instructions on the row, so that the keys are discoverable.
23. As a member, I want a failed save to put the row back, so that the screen never lies about the persisted order.
24. As a member, I want the order to be mine alone, so that nobody else can reorder my list.
25. As a maintainer, I want a single reorder write that is validated against the Day, so that a malformed or stale drop cannot corrupt the list.
26. As a maintainer, I want the read to stay a bounded indexed query, so that ordering does not turn into an in-memory sort.
27. As a maintainer, I want existing tasks backfilled, so that the app does not lose rows when the field becomes required.
28. As a maintainer, I want the mobile dock untouched in this slice, so that the desktop interaction ships first.

## Implementation Decisions

**Vocabulary.** Follows `GLOSSARY.md`: a _Day_ is a Europe/Zurich calendar day.
A _Task_ belongs to a Day (`plannedAt`). No new domain term is introduced; the
planned-session naming problem is explicitly deferred (see Further Notes).

**Library.** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
(installed). Chosen over `@hello-pangea/dnd` because the next slices drop onto
non-list targets (a planned-session block, a Day cell) and need custom collision
detection and a custom overlay; and over extending the timeline's hand-rolled
pointer drag because that code is about time geometries, not list indices.

**Schema shape (decision-rich):**

```text
task:
  ...existing fields...
  position: number?       optional on arrival, then backfilled; 0..n-1 within
                          (userId, plannedAt). Missing = fall back to creation order.
  indexes:
    by_userId_plannedAt    (userId, plannedAt)   existing — still the Day read
```

- `position` is a plain integer. Contiguous positions, rewritten on drop. A
  fractional rank was considered (one write instead of N) and rejected: the gaps
  shrink on repeated drops into the same slot and eventually need a rebalance
  pass, which is a mechanism to maintain in exchange for writes nobody can feel.
  A linked list was considered and rejected: Convex indexes cannot traverse
  pointers, so ordering would move into JavaScript, `.order()` and bounded
  `.take()` would stop being usable, and cycles / orphans / concurrent-splice
  corruption become states the database can hold.
- **Ordering happens in memory over the bounded Day read**, not through a
  third index field. The read is already capped at 200 rows, and a
  `(userId, plannedAt, position)` index would silently hide rows whose
  `position` is still missing between the first deploy and the backfill. The
  comparator is `position`, then `_creationTime`, with unpositioned rows after
  positioned ones. One index, one read, no state where half a Day disappears.

**Read contract.** `listMine({ dayStart })` returns the caller's tasks for that
Day in manual order: the Day's bounded read (newest-first by creation, capped),
then sorted by `position` with creation order as the fallback. Unauthenticated
callers still get `[]`. The Day still comes from the caller; the query never reads
the wall clock.

**Create.** `create({ title, plannedAt })` keeps its validation and appends by
reading the Day's tasks and taking the highest `position` plus one (or `0` when
the Day is empty). A new task therefore lands at the bottom, as today. While any
task of the Day is still unpositioned, the new task is inserted with no position
too, so creation order keeps putting it last.

**Reorder contract.** `reorder({ dayStart, orderedTaskIds })`:

- authenticates and rejects a malformed `orderedTaskIds` (duplicates);
- loads the caller's tasks for `dayStart`;
- every id in the array must belong to the caller **and** to that Day — an id
  from another Day or another user fails with the existing `Task not found`
  error, nothing is written;
- assigns `position = 0..k-1` in the given order;
- any task of that Day **not** in the array keeps its relative order after the
  given ones. This makes a drop tolerant of a task another device added mid-drag
  instead of failing the whole write;
- one atomic mutation, so the list is never half-ordered.

**Optimistic update.** The web reorder mutation carries a
`withOptimisticUpdate` that rewrites the `listMine({ dayStart })` result in the
cache to the new order before the server answers. Rollback is automatic on
error. This is what makes the drop feel instant; it is not optional polish.

**Drag interaction.** The whole row is the drag source; there is no dedicated
handle. `PointerSensor` with an 8px activation distance: a press-and-release is a
click (buttons and checkbox behave exactly as today), a press-and-move is a drag.
The action buttons stop `pointerdown`/`keydown` propagation so a gesture can
never leak from an icon into the row. Cursor: `cursor-grab` with
`active:cursor-grabbing`, matching the timeline track.

**Drag overlay.** `DragOverlay` renders a clone of the row: `card-surface` plus
`shadow-popover`, `scale-[1.02] rotate-[-1deg]`, no `shadow-glow` (reserved for
live indicators). The source row stays in place as the placeholder at reduced
opacity with no shadow, so the gap the row will occupy is visible. No tilt on the
placeholder.

**Keyboard.** `KeyboardSensor` on the same row. The row becomes focusable
(`tabIndex=0`) and carries dnd-kit's screen-reader instructions plus a live-region
`announcements` config ("Picked up <title>", "Moved to position 2 of 5", "Dropped
<title>", "Reordering cancelled"). Space lifts, Up/Down moves one slot, Space
drops, Escape cancels. Interactive children (checkbox, action buttons) stay
independently focusable and keep their own Space behaviour; the row's drag
listeners ignore key events that originate inside them.

**Layout.** Rows become `<li>` in a `<ul>` in the pane, so the sortable list has
list semantics. No visual change beyond the drag states.

**Active / NEXT.** No changes. The active pointer (`users.activeTaskId`) is
untouched by a reorder. `upNext` already derives from list order, so it follows
the new order for free. The "top of the list becomes NOW automatically" idea is a
separate piece of work and is not built here.

**Ownership and auth.** Unchanged: every mutation resolves the Clerk identity and
checks the task's owner; missing and foreign tasks share one error message.

**Migration.** `position` ships **optional**, so the deploy cannot fail against
rows that predate the field, and the read falls back to creation order until the
backfill has run. A one-off internal mutation then walks each
`(userId, plannedAt)` group in `_creationTime` order and stamps `0..n-1`;
idempotent, safe to rerun. The field can be tightened to required later, once
every deployment has run the backfill — this ticket does not require it, because
the fallback comparator already covers unpositioned rows.

**Docs.** `docs/domain-session-vs-plan.md` is not touched. `GLOSSARY.md` is not
touched in this slice.

## Testing Decisions

A good test asserts **external behaviour**: given seeded users, days and tasks,
what the caller gets back from a Convex function, and what a malformed call
rejects. Never internal helpers, never raw row shapes beyond the model.

**Seam 1 — the Convex function boundary** (`convex-test`), following
`tasks.test.ts`. Covers:

- `reorder` reorders only the caller's own tasks for the given Day;
- an id from another Day, another user, or a non-existent id is rejected and
  nothing is written;
- duplicate ids are rejected;
- a task added concurrently (not present in `orderedTaskIds`) survives and lands
  after the supplied order;
- `listMine` returns `position` order and is still Day-scoped and bounded;
- `create` appends after the current maximum, including on an empty Day;
- reordering does not change the active pointer, `done`, or `completedAt`;
- unauthenticated calls are rejected / return `[]` as today.

**Seam 2 — the pure ordering helpers** (plain Vitest): `byPosition` (position
first, creation order as fallback and tie-break, unpositioned rows last) and
`planOrder` (sent ids in order, then the Day's leftovers, unknown id throws).
Prior art: `tasks/util.test.ts`.

The web side is not unit-tested for drag mechanics. The interaction is verified by
hand: click still toggles, buttons still work, overlay follows the pointer,
keyboard lift/move/drop/cancel works, and the order survives reload.

## Out of Scope

- **Dragging a task to another Day.** Reorder is Day-scoped; a drop can never
  change `plannedAt`.
- **Dragging a task into a planned session.** The interaction and the write path
  are a later slice; the data model for it is still undecided.
- **Reworking NOW/NEXT.** No auto-promotion of the top row to NOW.
- **The mobile dock and its sheet.** Tap-only until the timeline interaction
  lands.
- **Multi-select or dragging several tasks at once.**
- **Renaming `plannedSession` or restructuring the Session / Plan model.** See
  Further Notes.
- **Auto-scroll tuning beyond what dnd-kit provides out of the box.**

## Further Notes

- **Supersedes the ordering clause of [[ST-27 Task planning and active task]]**:
  the list is no longer oldest-first by `_creationTime`; it is ordered by
  `position`. Everything else in ST-27 (the Day as the unit, the active pointer,
  the Session attribution) stands.
- **The planned-session refactor is deliberately parked.** During the grilling we
  found that `plannedSession` (an intention) and `session` (a real sitting) are
  different things, that `task.plannedSessionId` points at the **real** session,
  and that no mutation ever writes it. That naming and model deserve their own
  pass; this ticket must not depend on it. Background:
  `docs/domain-session-vs-plan.md`.
- **Next slices, in the intended order:** drag into a planned session; drag to a
  Day. Both need the Plan/Session model settled first.
- **Possible follow-up:** once order is manual, "top of the list is NOW" becomes
  natural. Do not build it here.
