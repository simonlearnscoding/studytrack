import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { DASHBOARD_TIME_ZONE, startOfDay } from '../sessions/util'
import { getMe } from '../users/service'
import type { ActiveTask, Task, TaskPlacement } from './types'
import { byQueueOrder, insertionIndex, planOrder } from './util'

const MAX_TASKS = 200

// The caller's tasks **planned for one Day**, in manual order. A task with no
// explicit position (written before the field existed) falls back to creation
// order, so the list reads as it did before the first drag. Task content is
// public (docs/adr/0007), so the room may read titles; ownership still gates
// writes. The caller supplies the Day start, so the query never reads the wall
// clock.
export async function listMine(ctx: QueryCtx, dayStart: number): Promise<Task[]> {
  const user = await getMe(ctx)
  if (!user) return []

  const tasks = await dayTasks(ctx, user._id, dayStart)
  return tasks.map(toTask)
}

// Add a task planned for the Day the caller is viewing. `end` (the default)
// appends it; `now` puts it on top so it becomes Now; `next` puts it right after
// the current Now. Rejects an empty title.
export async function createTask(
  ctx: MutationCtx,
  title: string,
  plannedAt: number,
  placement: TaskPlacement = 'end'
): Promise<void> {
  const user = await requireUser(ctx)
  const trimmed = title.trim()
  if (!trimmed) throw new Error('A task needs a title.')
  if (startOfDay(plannedAt, DASHBOARD_TIME_ZONE) !== plannedAt) {
    throw new Error('A task is planned for a Day, not a time.')
  }

  const existing = await dayTasks(ctx, user._id, plannedAt)
  if (placement === 'end') {
    const next = nextPosition(existing)
    await ctx.db.insert('task', {
      userId: user._id,
      title: trimmed,
      done: false,
      plannedAt,
      ...(next === null ? {} : { position: next }),
    })
    return
  }

  const index = insertionIndex(existing, placement)
  // Give the new task room at `index`. Every task from there down shifts one
  // place, which also positions legacy unpositioned tasks on the way.
  for (let i = existing.length - 1; i >= index; i--) {
    await ctx.db.patch(existing[i]._id, { position: i + 1 })
  }
  for (let i = 0; i < index; i++) {
    if (existing[i].position !== i) await ctx.db.patch(existing[i]._id, { position: i })
  }
  await ctx.db.insert('task', {
    userId: user._id,
    title: trimmed,
    done: false,
    plannedAt,
    position: index,
  })
}

// Replace the manual order of one Day. The ids must be the caller's own tasks of
// that Day; anything else fails as "not found" and nothing is written. Tasks the
// caller did not send (added on another device mid-drag) keep their order after
// the ones they did.
export async function reorderTasks(
  ctx: MutationCtx,
  dayStart: number,
  orderedTaskIds: Id<'task'>[]
): Promise<void> {
  const user = await requireUser(ctx)
  if (new Set(orderedTaskIds).size !== orderedTaskIds.length) {
    throw new Error('A task cannot appear twice in the new order.')
  }

  const tasks = await dayTasks(ctx, user._id, dayStart)
  const ordered = planOrder(tasks, orderedTaskIds)

  for (const [index, task] of ordered.entries()) {
    if (task.position === index) continue
    await ctx.db.patch(task._id, { position: index })
  }
}

// Move one owned task to another Day, at the bottom of that Day's queue. A plan
// link cannot survive the move: a planned Session belongs to the old Day, so it
// is cleared. Both Days' live queries update by themselves.
export async function rescheduleTask(
  ctx: MutationCtx,
  taskId: Id<'task'>,
  plannedAt: number
): Promise<void> {
  const user = await requireUser(ctx)
  if (startOfDay(plannedAt, DASHBOARD_TIME_ZONE) !== plannedAt) {
    throw new Error('A task is planned for a Day, not a time.')
  }

  const task = await requireOwnedTask(ctx, user, taskId)
  if (task.plannedAt === plannedAt) return

  const target = await dayTasks(ctx, user._id, plannedAt)
  const position = await appendPosition(ctx, target)
  await ctx.db.patch(task._id, {
    plannedAt,
    plannedSessionId: undefined,
    position,
  })
}

// Flip a task between Open and Done. Marking done stamps `completedAt` and clears
// the active pointer when this was the active task; reopening clears `completedAt`
// and never restores the pointer.
export async function toggleTask(ctx: MutationCtx, taskId: Id<'task'>): Promise<void> {
  const user = await requireUser(ctx)
  const task = await requireOwnedTask(ctx, user, taskId)

  const done = !task.done
  await ctx.db.patch(taskId, { done, completedAt: done ? Date.now() : undefined })
  if (done) await clearActiveIfMatches(ctx, user, taskId)
}

// Rename a task (Open or Done) so a typo or a Done record can be corrected.
// Rejects an empty title with the same error `create` uses.
export async function renameTask(
  ctx: MutationCtx,
  taskId: Id<'task'>,
  title: string
): Promise<void> {
  const user = await requireUser(ctx)
  const trimmed = title.trim()
  if (!trimmed) throw new Error('A task needs a title.')
  const task = await requireOwnedTask(ctx, user, taskId)

  await ctx.db.patch(task._id, { title: trimmed })
}

// Hard-delete the caller's task, Open or Done, and drop the active pointer when it
// pointed at this task. Ownership is checked, so another member's task never leaks
// its existence.
export async function removeTask(ctx: MutationCtx, taskId: Id<'task'>): Promise<void> {
  const user = await requireUser(ctx)
  const task = await requireOwnedTask(ctx, user, taskId)

  await ctx.db.delete(task._id)
  await clearActiveIfMatches(ctx, user, taskId)
}

// Point the caller's NOW at an owned, Open task. Setting the task that is already
// active keeps its original `activeSince`.
export async function setActive(ctx: MutationCtx, taskId: Id<'task'>): Promise<void> {
  const user = await requireUser(ctx)
  const task = await requireOwnedTask(ctx, user, taskId)
  if (task.done) throw new Error('Only an open task can be active.')

  const activeSince =
    user.activeTaskId === taskId && user.activeSince !== undefined ? user.activeSince : Date.now()
  await ctx.db.patch(user._id, { activeTaskId: taskId, activeSince })
}

// Explicitly clear the active pointer. Idempotent.
export async function clearActive(ctx: MutationCtx): Promise<void> {
  const user = await requireUser(ctx)
  await clearActivePointer(ctx, user._id)
}

// The caller's active task, or null when there is no pointer, the pointed task is
// gone, or the caller is unauthenticated.
export async function getActive(ctx: QueryCtx): Promise<ActiveTask | null> {
  const user = await getMe(ctx)
  if (!user || !user.activeTaskId || user.activeSince === undefined) return null

  const task = await ctx.db.get(user.activeTaskId)
  if (!task || task.userId !== user._id) return null

  return { task: toTask(task), activeSince: user.activeSince }
}

// A Day's tasks, bounded and in queue order (Open before Done, then manual
// position). Newest-first at the read so the cap keeps the most recent tasks
// when a Day is over it.
async function dayTasks(
  ctx: QueryCtx,
  userId: Id<'users'>,
  dayStart: number
): Promise<Doc<'task'>[]> {
  const tasks = await ctx.db
    .query('task')
    .withIndex('by_userId_plannedAt', (q) => q.eq('userId', userId).eq('plannedAt', dayStart))
    .order('desc')
    .take(MAX_TASKS)
  return tasks.sort(byQueueOrder)
}

// Where a new task goes. Null while the Day still holds tasks without a position:
// leaving it positionless keeps creation order and puts it at the bottom.
function nextPosition(tasks: Doc<'task'>[]): number | null {
  if (!tasks.every((task) => task.position !== undefined)) return null
  const highest = tasks.reduce((max, task) => Math.max(max, task.position ?? -1), -1)
  return highest + 1
}

// The position that appends to an existing Day. A Day written before positions
// existed is normalised first, so a moved task still lands at the bottom instead
// of sorting by its old creation instant.
async function appendPosition(ctx: MutationCtx, tasks: Doc<'task'>[]): Promise<number> {
  const next = nextPosition(tasks)
  if (next !== null) return next
  for (const [index, task] of tasks.entries()) {
    if (task.position !== index) await ctx.db.patch(task._id, { position: index })
  }
  return tasks.length
}

async function requireUser(ctx: MutationCtx): Promise<Doc<'users'>> {
  const user = await getMe(ctx)
  if (!user) throw new Error('Not authenticated')
  return user
}

// Same error for missing or someone else's task: never leak that it exists.
async function requireOwnedTask(
  ctx: MutationCtx,
  user: Doc<'users'>,
  taskId: Id<'task'>
): Promise<Doc<'task'>> {
  const task = await ctx.db.get(taskId)
  if (!task || task.userId !== user._id) throw new Error('Task not found')
  return task
}

// Clear the pointer only when it still points at this task, so completing or
// deleting side work never drops the caller's focus.
async function clearActiveIfMatches(
  ctx: MutationCtx,
  user: Doc<'users'>,
  taskId: Id<'task'>
): Promise<void> {
  if (user.activeTaskId !== taskId) return
  await clearActivePointer(ctx, user._id)
}

async function clearActivePointer(ctx: MutationCtx, userId: Id<'users'>): Promise<void> {
  await ctx.db.patch(userId, { activeTaskId: undefined, activeSince: undefined })
}

function toTask(task: Doc<'task'>): Task {
  return {
    id: task._id,
    title: task.title,
    done: task.done,
    completedAt: task.completedAt ?? null,
    plannedAt: task.plannedAt,
    plannedSessionId: task.plannedSessionId ?? null,
  }
}
