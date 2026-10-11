---
id: ST-5
status: in-review
type: requirement
priority: B
area: requirements
---

# ST-5 Tasks

Every member gets a private task list. This ticket is the **core**: the data and
the owner's own management. Making them visible to the room is ST-6. Spec:
[[Tasks spec]].

- new `task` table: `title`, `done`, `completedAt`, owner (`userId`); creation
  time comes from `_creationTime`
- self rail: create a task, toggle it done/open
- un-toggling a Done task clears `completedAt` — Done is not a one-way door
- only tasks **created today** are shown for now; older Open tasks persist in the
  database but stay out of view and out of the counts
- private: only the owner reads or writes their tasks (auth on every function)

Documented but **out of scope** for now: editing a task's title, and deleting
tasks. (Delete would be permitted for Open tasks only; Done tasks are kept as
history.)

Blocked by: ST-1.
