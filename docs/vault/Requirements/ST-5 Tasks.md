---
id: ST-5
status: in-review
type: requirement
priority: B
area: requirements
---

# ST-5 Tasks

**In short:** every member gets a private task list — a `task` table (`title`,
`done`, `completedAt`, owner `userId`) with create/toggle/rename/delete in the
UI, behind auth-checked Convex functions. The detail below is the original
ticket.

Every member gets a private task list. This ticket is the **core**: the data and
the owner's own management. Showing tasks to the room was a separate ticket,
retired with the dashboard redesign. Spec: [[Tasks spec]].

- new `task` table: `title`, `done`, `completedAt`, owner (`userId`); creation
  time comes from `_creationTime`
- self rail: create a task, toggle it done/open
- un-toggling a Done task clears `completedAt` — Done is not a one-way door
- only tasks **created today** are shown for now; older Open tasks persist in the
  database but stay out of view and out of the counts
- private: only the owner reads or writes their tasks (auth on every function)

**Shipped** since the original ticket: editing a task's title (`rename`) and
deleting tasks (`remove` — Open or Done; the room only ever sees counts, so
either is safe). Ownership is checked on both, same as `toggle`.

Blocked by: ST-1.
