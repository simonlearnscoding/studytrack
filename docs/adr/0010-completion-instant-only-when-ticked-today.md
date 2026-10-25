# A completion instant is recorded only when the box is ticked on today

The timeline draws a task dot at `Task.completedAt`, converted to a minute of the
Day. Nothing else places a dot. `tasks.toggle` used to stamp
`completedAt = Date.now()` on every completion, so ticking a task while the board
was focused on an earlier Day wrote an instant that belonged to today: the task's
own Day got no dot, and today's timeline got one for work that was not done
today.

The mutation now takes the Focus day the member is looking at. The server compares
it with its own today (Europe/Zurich): equal, the completion is live and gets
`Date.now()`; different, the task is Done with no instant at all. The rule is
keyed on what the member was viewing, not on `plannedAt` — a plan says which Day
a task belongs to, not when its box was pressed.

## Consequences

- A task can be Done without a completion instant. The timeline already skips a
  null `completedAt`, so it draws no dot, and the task row shows no clock.
- `recordedAt` ("when the box was pressed") is not stored yet: no surface reads
  it, and it can be added later as an optional field without a migration.
- The dashboard's finished-today read still keys on `completedAt`, so a
  retrospective completion does not appear as finished today; it still appears on
  its own Day through `plannedAt`.
- A task planned for an earlier Day but ticked while viewing today still gets an
  instant: the rule is about the live view, not the plan.
- The task pane names the Day it is recording against, and the mobile Now bar
  shows that Day instead of "Now" when it is not today — the box must never be
  ticked without the Day on screen.

## Considered and rejected

- **Infer from `plannedAt === today`.** No new argument, one line. It is only
  true while a task can be ticked solely from its own Day's list; the first
  surface that completes a carried-over or global Now task would silently break.
- **Stamp the viewed Day's end.** Invents an instant and puts the dot at 23:59.
- **Let the client supply `completedAt`.** Moves the rule to the client and lets a
  stale tab mint a today instant.
- **A completion-event table.** The right shape if corrections and history become
  a product requirement; too much for this fix (see the handoff's model
  direction).
