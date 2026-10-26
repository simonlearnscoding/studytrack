---
id: ST-36
status: todo
type: requirement
priority: C
area: requirements
---

# ST-36 Delete the unused active-task pointer

#ready-for-agent

**In short:** Now is derived, so the stored `users.activeTaskId` / `activeSince`
pointer and its mutations are dead code. Remove them.

**Blocked by:** None.

## Context

[[ST-27 Task planning and active task]] built a per-member active task on the user
row. ADR-0011 retired it before any surface read it: Now is derived from the Day
queue, and since [[ST-35 Plan groups in the task view]] it leads with the live plan
block. A stored pointer would have to be resynced on create, drag, complete,
delete, reschedule, reopen and midnight, and one missed writer is a confidently
wrong room.

Nothing reads the pointer today. It is only written by its own mutations and by
the completion path that clears it, so it is a second, silently wrong answer to a
question the app already answers by derivation.

## What to build

- Delete `tasks.setActive`, `tasks.clearActive` and `tasks.getActive`, with
  `setActiveTaskArgs`, the `ActiveTask` view type and the service functions
  behind them.
- Delete `pickUpNext` from `tasks/util.ts` and the active-clear branch in the
  completion path, so ticking a Task touches only its own row.
- Drop `activeTaskId` and `activeSince` from the `users` schema.
- Strip the two fields from any row that still carries them before the schema
  change lands, or the deployment will fail to read those rows. A dev deployment
  can be reset with `pnpm clear`; a deployment with real members needs the
  one-off migration in `packages/backend/convex/migrations.ts`.
- Keep `nowCandidates` and `tasks.getNow` exactly as they are: they are the
  derived Now ADR-0011 chose, not the pointer.

## Acceptance criteria

- [ ] No code reads or writes `activeTaskId`, `activeSince`, `setActive`,
      `clearActive`, `getActive` or `pickUpNext`.
- [ ] The `users` table no longer declares the two fields, and a deployment with
      rows that had them still reads.
- [ ] Ticking the Task a member currently sees as Now leaves every other Task's
      state untouched and changes Now only by derivation.
- [ ] `tasks.getNow` and the room rail show the same Now as before the change.

## Testing Decisions

The seam stays the Convex function boundary (`convex-test`). The pointer's own
tests are deleted with it; the completion tests keep their Now assertions, which
now pass through derivation only. No new pure-helper tests: this removes code
rather than deciding anything.

## Out of Scope

- Pinning a chosen-not-top Task as Now. ADR-0011 rejected it; if that changes it
  is a new decision, not a revived pointer.
- A room read of members' Now beyond what the dashboard already derives.
- Carry-over and re-planning UX, which stays in
  [[Tasks — planning mechanics to decide]].

## Related

- [[ST-27 Task planning and active task]] · [[ST-35 Plan groups in the task view]]
- [[ST-24 Active task and next suggestion]] · [[data-model]]
