---
id: ST-30
status: todo
type: requirement
priority: B
area: requirements
---

# ST-30 Foldable Done group

#ready-for-agent

**In short:** the task queue's Done tasks sit under a `Done · 4` heading that folds
away with a caret, and the choice is remembered in the member's Preferences so it
follows them across devices. Expanded by default, global across every Day, hidden
when nothing is Done. Done rows stop being draggable. This is the first use of a
shared, named, toggleable group — the shape planned-session groups will reuse.

## Problem Statement

The task pane is one flat list. As a Day fills up, completed work takes as much
room as the work that is left: to see what remains, the member scrolls past rows
that are already history. The list answers "what did I do" when the member is
asking "what is next".

There is also no way to say "put finished work away" once and be done with it.
Any such state today would be either local to one surface or forgotten between
visits, so the pane would behave differently on the desktop and the phone, or
reset on every reload.

## Solution

A Day's Done tasks become a named group at the bottom of the queue, headed
`Done · 4` with a caret. Clicking the heading folds the group to just its
heading; clicking again opens it. The fold is a Preference: one choice for the
member, applied to every Day, stored server-side so it follows them between
devices. It starts expanded, and the group does not exist at all on a Day with
nothing Done.

Folding is presentation only. It never changes `completedAt`, the timeline, the
Day's counts, or which task is Now. Done rows are records, not work in progress,
so they cannot be dragged — in either state.

The panel and the mobile sheet show the same group with the same state, and the
heading is a real button, so folding is keyboard- and screen-reader-reachable.

## User Stories

1. As a member, I want the Done tasks of a Day grouped under a clear `Done` heading, so that the list reads as the work that is left.
2. As a member, I want to fold that group away with one click, so that the pane shows only what I still have to do.
3. As a member, I want the fold remembered across reloads, so that I do not fold it again on every visit.
4. As a member, I want my fold to follow me to another device, so that the pane behaves the same wherever I open it.
5. As a member, I want the fold to apply to every Day, so that browsing yesterday does not surprise me with a different layout.
6. As a member, I want the group to start expanded, so that I can see what I finished without opting in first.
7. As a member, I want the number of Done tasks beside the heading, so that I know how much is folded without opening it.
8. As a member, I want no Done heading on a Day where nothing is Done, so that an empty group never takes space.
9. As a member, I want each Done row to keep its completion time, so that the record is still legible when I open the group.
10. As a member, I want to unfold and un-tick a Done task, so that a mistaken completion is still fixable.
11. As a member, I want Done rows not to drag, so that I cannot accidentally reorder history.
12. As a member, I want an open row to drag only among open rows, so that arranging work never moves a record.
13. As a member, I want ticking a task to move it into the Done group, so that the open list stays about what is left.
14. As a member, I want un-ticking a task to return it to the open list, so that completing and reopening feel symmetric.
15. As a member, I want the Done group to sit below every open task, so that Now and the next tasks stay at the top.
16. As a member, I want folding to leave Now, the counts and the timeline untouched, so that hiding a row changes only what I see.
17. As a member, I want the group to stay put while I scroll a long open list, so that the fold control never floats over content.
18. As a member on mobile, I want the same Done group in the task sheet, so that the two surfaces agree.
19. As a member on mobile, I want the fold state to survive closing and reopening the sheet, so that it does not reset mid-session.
20. As a member, I want folding to take effect immediately, so that I do not wait for the network to answer.
21. As a member, I want a failed save to put the fold back, so that the screen never claims a state the server rejected.
22. As a keyboard user, I want the heading to be focusable and toggleable with Enter or Space, so that folding is not mouse-only.
23. As a keyboard user, I want the caret to point the way the group is folded, so that I can tell its state at a glance.
24. As a keyboard user, I want focus to stay on the heading after toggling, so that I can toggle back without hunting for it.
25. As a screen-reader user, I want to hear the group name, its count and whether it is expanded, so that the control describes itself.
26. As a screen-reader user, I want folded rows out of the tab order, so that I never tab through rows I cannot see.
27. As a screen-reader user, I want the group heading to announce a change of state, so that folding is not silent.
28. As a reduced-motion user, I want only the caret to move, so that opening the group never animates the list.
29. As a maintainer, I want the fold stored as its own Preference column, so that changing the metric can never clear it and vice versa.
30. As a maintainer, I want the fold field optional on existing rows, so that deploying needs no migration and old members keep working.
31. As a maintainer, I want the Done group derived from the queue, so that there is no second ordering to keep in sync.
32. As a maintainer, I want Done rows outside the sortable list, so that the drag contract never claims a row that cannot move.
33. As a maintainer, I want a thin shared group component, so that planned-session groups reuse its heading instead of growing their own.
34. As a product owner, I want this to be the first named, toggleable group, so that the next group is a reuse and not a rewrite.

## Implementation Decisions

**Schema.** Add one optional boolean to the existing `preference` row, which remains
one row per member and one column per setting:

```text
preference:
  userId: Id<'users'>
  metric: 'focus' | 'total'
  isDoneFolded: boolean | undefined   # absent = expanded
```

Optional rather than required: rows written before the field exist, and a missing
value means expanded. Global, not per-Day: the member folds Done once, everywhere.

**View type and defaults.** The `Preference` view type gains `isDoneFolded: boolean`.
Defaults are applied server-side, as the metric already is, so the web never
invents its own fallback: missing Preference row or missing column both read as
`false` (expanded).

**Write.** One new mutation, `setDoneFolded({ folded })`, wired like `setMetric`:
authenticate, find the member's row, patch that column or insert a row on the
first write. Patching a single column is what guarantees the metric survives a
fold write; the reverse is already true.

**Reading on the web.** A `useDoneFold()` hook mirrors the metric hook: it reads
the live Preference and exposes the value with a writer. The writer is optimistic.
Its cache patch reads the current cached Preference and merges the new flag rather
than writing `{ isDoneFolded }` wholesale, so the optimistic state does not erase
`metric`.

**First paint.** With expanded as the default, an unresolved read would render
Done rows and then fold them, making content disappear. So when the Day has at
least one Done task, the group's body waits for the Preference while the heading
and count render immediately. On days with no Done tasks nothing waits.

**Group shape.** Groups are a view over the queue's single flat order, not stored
entities. The queue's derived state gains an open-task list and a Done-task list;
a thin `TaskGroup` component renders a heading (`label`, `count`, caret, optional
trailing slot) and a body. Done is its only caller today. The heading is a
`<button>` with `aria-expanded`; the collapsed body is unmounted, not hidden, so
it leaves the tab order. The accessible name carries the count ("Done, 4 tasks").

**Drag.** Only open rows join the sortable list. Done rows render as plain list
items at both fold states — no drag listeners, no keyboard lift, no grab cursor,
and no "sortable task" announcement. A reorder sends only the open ids; because
Done ids always sit at the tail of the queue, the existing order-reconstruction
rule appends them in their current order and reproduces exactly the result a
whole-list reorder produced before.

**Visual.** The heading is a full-width row above a hairline separator, using the
shared label type and a chevron that points right when folded and down when open;
the chevron rotates briefly and respects reduced motion. No sticky positioning, no
height animation, no change to row styling. The group is not rendered at zero Done.

**Behaviour rules.** Never auto-unfold: ticking the last open task, or a change
from another device, leaves the member's choice alone. Folding does not change
Now, completion instants, timeline dots, or counts. Both surfaces read the same
Preference, so the desktop pane and the mobile sheet can never disagree.

**Docs.** The glossary's `Preference` entry widens from "the metric it leads with"
to cover fold state, and a `Task group` entry is added under Views. The timeline's
night band keeps its browser-local expansion; that is a screen-local concern, not
a member Preference, and this change does not touch it.

## Testing Decisions

A good test asserts external behaviour: call the same Convex functions the browser
calls, and assert the returned view types and what a follow-up public query reads
back. Never internal helpers, never raw row shapes beyond the model.

**One seam — the Convex function boundary**, using `convex-test`, following the
existing Preferences test suite (`preferences.test.ts`). Cases:

- `preferences.mine` reads expanded for a signed-out caller and for a member who
  has never chosen.
- A member who set the metric but has no fold column still reads expanded.
- `setDoneFolded({ folded: true })` persists, and `mine` reads folded.
- Unfolding persists the same way.
- A fold write leaves `metric` unchanged; a metric write leaves the fold unchanged.
- A member still has exactly one Preference row after both kinds of write.
- A signed-out `setDoneFolded` is rejected with the existing "Not authenticated".

**Deliberately not a seam of its own.** Splitting the queue into open and Done,
formatting `Done · 4`, choosing the caret direction, withholding the body on first
paint, and narrowing the reorder payload are trivial derivations or presentation.
They have no branching decision worth a test, and this repo has no component-test
harness; adding one for this slice would cost more than it protects.

## Out of Scope

- Per-Day fold memory. The choice is global by decision.
- Six-dot drag handles, a per-row "…" menu, and moving row actions into it.
- The group card treatment from the design mock: bordered block, left accent
  stripe, indented body.
- The `Unscheduled` group and planned-session groups (`Deep work`, `Admin`) with
  their time ranges and `2/3` counts.
- Dragging a task into, out of, or between groups, and the `plannedSessionId`
  writes that will make those drops real.
- A tooltip explaining the fold, and a "Show completed (4)" alternate control.
- Any change to `completedAt`, timeline dots, Day counts, Now, or the stacking of
  Notifications.
- Reopening a Done task without unfolding first: folded rows are not interactive.
- Moving the night band's expansion into Preferences.

## Further Notes

This is the first instance of a general idea: a named group of tasks that can be
folded, with a count and a caret. The planned-session groups in the mock are the
next instances. That is why the heading is a shared component now, even with one
caller, and why group membership stays derived: dragging into a session will write
`plannedSessionId` and reuse the existing order machinery, with no second ordering
to reconcile.

The design mock also shows the destination for row affordances and group chrome;
both are listed under Out of Scope so this slice stays about folding.

Sources: the `next-steps.md` entry "Collapsible Done section", the design mock for
the task queue, and the design conversation of 2026-10-24.
