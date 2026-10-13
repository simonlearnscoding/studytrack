---
id: ST-16
status: todo
type: requirement
priority: B
area: requirements
---

# ST-16 Edit and delete tasks

#ready-for-agent

Source: [[general-ideas]] ("I should be able to edit and delete Tasks"). This
was already promised as "documented, not built" in [[Tasks spec]] story 20. This
ticket builds it under the rules that spec set.

Vocabulary: `GLOSSARY.md` (Task, Open, Done). Domain: `packages/backend/convex/tasks/`.

## User Stories

1. As a member, I want to fix a typo in a task title, so that my list reads right.
2. As a member, I want to rename a Done task too, so that my record of what I did is accurate.
3. As a member, I want to delete an Open task I added by mistake or no longer need, so that my list stays honest.
4. As a member, I want a Done task kept, so that what I finished stays part of my record (and, later, the timeline markers in [[ST-6 Task visibility]]).
5. As a member, I want to remove a Done task I ticked by mistake by reopening it first and then deleting it, so that mistakes are fixable without making Done disposable.
6. As a member, I want nobody else to be able to rename or delete my tasks.

## Implementation Decisions

- **Decided — two new mutations**, in the `tasks` domain shape (`tasks.ts` entry,
  `tasks/service.ts`, `tasks/types.ts` validators):
  - `rename({ taskId, title })` trims the title. An empty title is rejected with
    the same `Error('A task needs a title.')` that `create` uses. It works on
    Open and Done tasks.
  - `remove({ taskId })` hard-deletes an **Open** task. Called on a Done task, it
    throws `Error('Reopen the task before deleting it')`.
  - Both reuse the ownership check from `toggleTask`. Someone else's task gets
    the same `Error('Task not found')`, so its existence never leaks.
- **Decided — UI in `task-row.tsx`.**
  - The whole row stays the toggle.
  - Add a trailing actions area that appears on row hover or focus. It must not
    toggle when clicked (`stopPropagation`).
  - The actions are ✏️ (rename) and 🗑 (delete). Delete is shown on Open rows
    only.
  - Rename swaps the title for an inline `<input>`. Enter or blur saves,
    Escape cancels, and an empty value reverts.
  - Delete has no confirm dialog. The task is Open, so little is lost, and a
    confirm would slow down the common case.
  - Use `lucide-react` icons (`Pencil`, `Trash2`), matching the existing `Check`.
- **Decided — wire through `useMyTasks`** in `tasks/hooks.ts`: expose `rename`
  and `remove` next to `create` and `toggle`. Don't add optimistic updates. The
  reactive query already updates the list, the same way it does for toggle.

## Testing Decisions

`convex-test` in `tasks.test.ts`, following the existing cases:

- rename works on Open and Done tasks;
- an empty or whitespace-only title is rejected;
- removing an Open task deletes it;
- removing a Done task throws;
- rename and remove on another user's task fail as "not found";
- an unauthenticated caller is rejected.

## Acceptance Criteria

- [ ] `rename` and `remove` implemented and tested as above.
- [ ] Rename and delete work in the self rail without toggling the row.
- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` pass.

## Out of Scope

- Moving tasks between Days (carry-over), and the past-days view. Both belong to
  Planning in [[Roadmap]].
- Undo.

Blocked by: nothing ([[ST-5 Tasks]] is in review; build on top of it).
