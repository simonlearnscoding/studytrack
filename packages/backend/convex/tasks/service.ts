import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { DASHBOARD_TIME_ZONE, startOfDay } from '../sessions/util'
import { getMe } from '../users/service'
import type { ActiveTask, Task } from './types'

const MAX_TASKS = 200

// The caller's tasks **planned for one Day**, newest first. Task content is public
// (docs/adr/0007), so the room may read titles; ownership still gates writes. The
// caller supplies the Day start, so the query never reads the wall clock.
export async function listMine(ctx: QueryCtx, dayStart: number): Promise<Task[]> {
  const user = await getMe(ctx)
  if (!user) return []

  const tasks = await ctx.db
    .query('task')
    .withIndex('by_userId_plannedAt', (q) => q.eq('userId', user._id).eq('plannedAt', dayStart))
    .order('desc')
    .take(MAX_TASKS)

  return tasks.map(toTask)
}

// Add a task planned for the Day the caller is viewing. Rejects an empty title.
export async function createTask(
  ctx: MutationCtx,
  title: string,
  plannedAt: number
): Promise<void> {
  const user = await requireUser(ctx)
  const trimmed = title.trim()
  if (!trimmed) throw new Error('A task needs a title.')
  if (startOfDay(plannedAt, DASHBOARD_TIME_ZONE) !== plannedAt) {
    throw new Error('A task is planned for a Day, not a time.')
  }

  await ctx.db.insert('task', { userId: user._id, title: trimmed, done: false, plannedAt })
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
