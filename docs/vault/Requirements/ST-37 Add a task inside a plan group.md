---
id: ST-37
status: todo
type: requirement
priority: B
area: requirements
---

# ST-37 Add a task inside a plan group

#ready-for-agent

**In short:** an expanded plan group in the task pane ends with a one-line
composer, so a member can create a Task directly in that planBlock instead of
opening the timeline popover or dragging from the main queue.

**Blocked by:** none.

## Problem Statement

The task pane is where a member arranges the Day, and a planBlock already has a
group there (ST-35). But the group only accepts work that exists somewhere else:
the member must first create the Task in the main queue and drag it in, or open
the block's timeline popover and use its "Add a task" search. Both paths leave
the pane to do something the pane is already looking at. In the common case —
"I am looking at my 13:00 block and I know what I mean to do in it" — there is no
way to say it in one line, in place.

## Solution

Every expanded plan group ends with an inline composer: a `+` submit button and a
single-line input reading "Add a task to this block…". Enter (or the `+`) creates
the Task on the block's Day and assigns it to that planBlock in one write, so it
appears as the last row of the group and never in the main queue. The composer
stays put, so several tasks can be added back to back. A refusal shows a caption
under the field and keeps the typed title. Folded groups have no composer; the
mobile sheet is unchanged.

## User Stories

1. As a member looking at a plan group, I want a one-line input at the end of the
   group, so that I can add work to that planBlock without leaving the pane.
2. As a member, I want the new Task to land inside the planBlock I typed it in, so
   that I do not have to drag it there afterwards.
3. As a member, I want the Task created on the planBlock's Day, so that planning
   Thursday from Thursday's view does not silently put work on today.
4. As a member, I want the new Task to appear as the last row of that group, so
   that the block reads in the order I planned it.
5. As a member, I want the Task to be assigned, not merely created, so that it
   never shows up twice — once in the group and once in the main queue.
6. As a member, I want the group's count and `done/total` to update live after I
   add, so that I can see the plan grow.
7. As a member, I want the timeline block's task list to reflect the same write,
   so that the popover and the pane never disagree.
8. As a member, I want Enter to add the task and keep the field focused and
   cleared, so that I can enter several tasks in a row.
9. As a member, I want the `+` to submit as well, so that it behaves like the
   composer directly above it.
10. As a member, I want the `+` disabled while the field is blank, so that I
    cannot submit nothing.
11. As a keyboard user, I want every Enter variant (plain, Shift, Mod) to add to
    this plan group, so that I never trigger the main composer's placement
    semantics — placement belongs to the group.
12. As a keyboard user, I want Mod+Enter inside this field not to jump focus to
    the main composer, so that the shortcut does not fight the field I am in.
13. As a keyboard user, I want Escape to clear the draft and leave the field, so
    that abandoning a half-typed task is one key.
14. As a member, I want a half-typed draft to be forgotten when I fold the group,
    so that a hidden field never holds state I cannot see.
15. As a member, I want a rejected write to explain itself under the field, so
    that a plan that ended while I was typing does not fail silently.
16. As a member, I want the typed title kept when a write is refused, so that I
    can retry or move it without retyping.
17. As a member viewing an empty plan group, I want the "Drop a task here to plan
    it" hint to stay, so that I still know dragging works.
18. As a member, I want the composer on a live group as well as an upcoming one,
    so that I can add work to the block I am in.
19. As a screen-reader user, I want the field and its submit button labelled, so
    that the row is usable without seeing the placeholder.
20. As a member on a phone, I want the mobile sheet to stay a flat list, so that
    the desktop arrangement does not leak into the small surface.

## Implementation Decisions

- **One row, one seam.** A new `PlanBlockComposer` component owns the row and
  exposes `onAdd(title)`. Today it is a plain input; when the popup's add-or-create
  search comes here later, only this component changes.
- **Placement in the block.** The row renders after the group's task list, not as
  a sortable item. The shared task-group heading gains a body-slot for it, so the
  `+` is never nested inside the heading's toggle button (a button inside a button
  is invalid and mis-announced).
- **Write path.** The Day task queue gains `assignNewTask(planBlockId, title)`,
  backed by the existing `planBlocks.assignNew` mutation. No backend change: it
  already requires ownership, creates the Task on the planBlock's Day, assigns it
  in one transaction, and refuses an ended plan or a full plan.
- **The action returns its promise.** Every other queue action is fire-and-forget
  and only logs. This one must reject into the composer so the caption can show
  the reason. No optimistic update: the live read lands the row, matching how the
  stored popover already writes.
- **Failure copy.** Known backend reasons ("That plan has ended.", the plan's task
  cap) show as-is; anything else falls back to "Could not add the task." The
  caption clears on the next keystroke or submit. The title clears only on success.
- **Keyboard.** Reuse the composer's existing Enter/Escape contract, passing a
  single placement — the group, not the row, decides where the Task goes. The `+`
  is a submit button disabled while the trimmed title is empty.
- **Draft scope.** The draft is local to the row and is lost when the group folds
  (the body unmounts). No lifting to the pane.
- **Copy.** Placeholder "Add a task to this block…". The empty-group hint is
  unchanged. The row names a planBlock, never a workSession.
- **Surfaces.** Desktop task pane only. The mobile sheet stays flat with the plan
  chip.

## Testing Decisions

A good test here asserts observable behavior at a seam that already exists, not
the composer's markup: what ends up stored for a member and what they see after
re-reading.

- **The seam: `planBlocks.assignNew`.** This is the one seam, and it already
  exists with prior art in the plan-assignment suite. Extend it to pin the
  behavior this feature leans on: a new Open Task is created on the block's Day
  and assigned to that planBlock; it appears in that group's list and not in the
  main queue, in last position; a refusal (ended plan, another member's block)
  leaves neither Task nor assignment behind.
- **No new web test harness.** The app has no component tests, and the composer
  is presentation over that seam. Adding a harness for one row would cost more
  than it protects. Its behavior is checked by hand: `+` disabled while blank,
  Enter and `+` both add, focus is kept, Escape clears and blurs, the caption
  appears on refusal and the title survives, folding hides the row.
- If the failure-copy mapping grows real branching, give it a plain Vitest test
  colocated with the component rather than testing through the DOM.

## Out of Scope

- Picking or searching an existing Task from the row. The seam is reserved; the
  popup's add-or-create search is a follow-up.
- Any change to the policy for active or ended planBlocks. That policy read as
  unintuitive in use and gets its own session; this spec works with it as-is.
- Plan groups in the mobile sheet.
- The coloured accent stripe and the `⋯` menu from the sketch — both were kept
  out by ST-35 and remain out.
- Editing or removing a planBlock from the pane, per-group ordering, and moving
  tasks between groups other than by drag.

## Further Notes

- **Supersession.** ST-35 listed "an 'Add a task to this session row'" under
  *Kept out*. This spec reverses that decision. The old wording is also wrong on
  the domain: the row belongs to a **planBlock**, and a planBlock is never a
  workSession. ST-35 is otherwise untouched.
- No ADR: the change is easily reversed and the trade-off is local.
- No glossary change: `planBlock` and "Plan assignment" already say exactly this.
- Vocabulary: this row adds a **Plan assignment**; it does not create or extend a
  workSession.
