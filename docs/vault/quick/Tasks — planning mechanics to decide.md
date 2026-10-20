# Tasks — planning mechanics to decide

Backend decisions: [[ST-27 Task planning and active task]].

## Decided

- `plannedAt` is a Day (Europe/Zurich day start), not a time.
- A task can be planned into a real Session with an explicit `plannedSessionId`; the link is not inferred from time overlap.
- Creating while viewing a Day plans the task for that Day, including future Days.
- The list is oldest-first (new tasks at the bottom); the active task lives on the user and clears when completed, deleted, or explicitly cleared.
- A task planned in Session A and finished in Session B shows in both: A as planned/not checked, B as finished. Planned + finished in one Session shows once.

## Open

- **Carry-over**: how an open task moves from a past Day to today. Manual only for now (mutate `plannedAt`). Needs UX and a decision on whether a "carried over" mark or history is kept.
- **Re-planning**: changing a task's planned Day from the UI. Out of scope for the first pass, but the schema supports it.
- **Drag into a Session**: the write path, the drop gesture, and mobile. The data model is decided; the interaction is not.
- **Overdue**: how the UI surfaces (or hides) yesterday's unfinished plans.
- **Active vs. tracking**: whether leaving a Session clears the active task once real tracking exists.
