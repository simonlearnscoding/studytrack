---
id: ST-19
status: done
type: decision
priority: A
area: sessions
---

#wayfinder/grilling

## Question

How does a Task attach to the Session it was finished in? Auto-bind by
`completedAt` falling inside `[startedAt, endedAt)` needs no migration but is
derived at read time; a `sessionId` foreign key written at completion is
explicit but adds a column and a write path. Decide which, given the
hover-on-session-line surface and the existing task schema (title, done,
completedAt, userId).

## Answer

A Task attaches to the Session whose span contains its `completedAt` —
auto-bound at read time, no schema change.

- The whole span `[startedAt, endedAt)` **is** the Session: a task done during a
  pause still attaches.
- No active session → the task stays **unattached**: no session hover, but it
  keeps its existing yellow marker on the day timeline (hover shows the task).
- Derivation: for each session, tasks where `completedAt ∈ [startedAt, endedAt)`.
  Un-marking clears `completedAt`, so the task drops out for free.

Consequence for ST-21: the hover-on-session-line reads tasks by a `completedAt`
range over the session's span; no `sessionId` column, no migration.
