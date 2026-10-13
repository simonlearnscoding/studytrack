import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { getMe } from '../users/service'
import type { Task } from './types'

const MAX_TASKS = 200

// The caller's tasks **created today**, newest first. Only the owner ever sees
// these — the room gets counts elsewhere (ST-6). Tasks from earlier days stay in
// the database but are out of view for now.
export async function listMine(ctx: QueryCtx, dayStart: number): Promise<Task[]> {
  const user = await getMe(ctx)
  if (!user) return []

  const tasks = await ctx.db
    .query('task')
    .withIndex('by_userId', (q) => q.eq('userId', user._id))
    .take(MAX_TASKS)

  return tasks
    .filter((task) => task._creationTime >= dayStart)
    .sort((a, b) => b._creationTime - a._creationTime)
    .map(toTask)
}

// Add a task to the caller's list. Rejects an empty title.
export async function createTask(ctx: MutationCtx, title: string): Promise<void> {
  const user = await requireUser(ctx)
  const trimmed = title.trim()
  if (!trimmed) throw new Error('A task needs a title.')

  await ctx.db.insert('task', { userId: user._id, title: trimmed, done: false })
}

// Flip a task between Open and Done. Marking done stamps `completedAt`; reopening
// clears it, so Done is not a one-way door.
export async function toggleTask(ctx: MutationCtx, taskId: Id<'task'>): Promise<void> {
  const user = await requireUser(ctx)
  const task = await requireOwnedTask(ctx, user, taskId)

  const done = !task.done
  await ctx.db.patch(taskId, { done, completedAt: done ? Date.now() : undefined })
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

// Hard-delete the caller's task, Open or Done. Ownership is checked, so another
// member's task never leaks its existence.
export async function removeTask(ctx: MutationCtx, taskId: Id<'task'>): Promise<void> {
  const user = await requireUser(ctx)
  const task = await requireOwnedTask(ctx, user, taskId)

  await ctx.db.delete(task._id)
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

function toTask(task: Doc<'task'>): Task {
  return {
    id: task._id,
    title: task.title,
    done: task.done,
    completedAt: task.completedAt ?? null,
  }
}
