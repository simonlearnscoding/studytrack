> **Amended by ADR-0014 (ST-35):** Now leads with a live plan block, then the
> unscheduled queue, then the earliest upcoming plan. The derived, never-stored
> rule stands; only the order Now is picked from changed.

# Now is today's top task, not the viewed Day's

The center header used the viewed Day's queue, so browsing yesterday changed
what it said the member was on. The live room read `users.activeTaskId`, a
pointer no mutation ever wrote, so it showed nothing. Both surfaces were asking
"what is this member on now?" of different, wrong sources.

Now is defined as the first Open task of **today's** queue, by `plannedAt` and
queue order. It is derived on every read: `tasks.getNow` for the member's own
surfaces, and the dashboard's per-member tasks for the room. Nothing is stored.
The header and the mobile bar read today's Now regardless of the Focus day; a
past Day's list shows no NOW marker because its top task is not now. The room
derives the same value, so every surface agrees by construction.

## Considered and rejected

- **Store `users.activeTaskId`.** It can only drift: create at the top, drag,
  complete, delete, reschedule, reopen and midnight all change today's top, so
  every writer would have to resync, and a missed one is a confidently wrong
  room. It buys `activeSince` and a chosen-not-top task, neither of which is
  wanted here. The pointer and its mutations are now unused; delete them when
  convenient.
- **Write on read / on first page load.** Convex queries cannot write, and a
  read that mutates races the realtime subscription. Derivation needs no write.
- **Keep Now per viewed Day.** That is the bug: yesterday's top task is not what
  the member is on.

## Consequences

- The header tick is always a live completion and passes **today** as the Focus
  day, even when the board shows another Day (ADR-0010).
- The pane's NOW badge and the mobile sheet's NOW chip are gated on
  `isViewingToday`; the desktop pane and the sheet still list the viewed Day.
- A member's Now is public through the room rail like any other task title
  (ADR-0007).
