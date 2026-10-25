import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { getClockNow } from '../devClock/service'
import { createTaskForDay, moveTaskToDay, reorderTasks } from '../tasks/service'
import { byQueueOrder } from '../tasks/util'
import { getMe } from '../users/service'
import { DASHBOARD_TIME_ZONE, nextDayStart, startOfDay } from '../workSessions/util'
import type { PlanBlockDetail, PlanBlockTask } from './types'

// The planning grid: the drag snaps to quarters, so the backend only accepts
// marks on the same grain.
export const PLAN_GRAIN_MS = 15 * 60 * 1000

// Bounded reads: a member's planBlocks for one Day sit far below this.
const MAX_PLANS_PER_MEMBER_DAY = 200
const MAX_TASKS_PER_PLAN = 200
const MAX_ASSIGNMENTS_PER_TASK = 200

// The caller's planBlocks for one Day, oldest first, without the room read.
export async function listMine(ctx: QueryCtx, dayStart: number): Promise<Doc<'planBlock'>[]> {
  const user = await getMe(ctx)
  if (!user) return []
  const planBlocks = await ctx.db
    .query('planBlock')
    .withIndex('by_userId_dayStart', (q) => q.eq('userId', user._id).eq('dayStart', dayStart))
    .order('desc')
    .take(MAX_PLANS_PER_MEMBER_DAY)
  return planBlocks.reverse()
}

// One planBlock with its tasks, for the stored popover. Public to every signed-in
// member: blocks and task titles are public (ADR-0007). `isOwner` is the only
// thing that differs between your block and someone else's.
export async function getWithTasks(
  ctx: QueryCtx,
  planBlockId: Id<'planBlock'>
): Promise<PlanBlockDetail | null> {
  const user = await getMe(ctx)
  if (!user) return null
  const plan = await ctx.db.get(planBlockId)
  if (!plan) return null

  const assignments = await ctx.db
    .query('planAssignment')
    .withIndex('by_planBlockId', (q) => q.eq('planBlockId', planBlockId))
    .take(MAX_TASKS_PER_PLAN)
  const tasks = await Promise.all(assignments.map((assignment) => ctx.db.get(assignment.taskId)))
  const ordered = tasks.filter((task): task is Doc<'task'> => task !== null).sort(byQueueOrder)

  return {
    id: plan._id,
    userId: plan.userId,
    dayStart: plan.dayStart,
    title: plan.title ?? null,
    plannedStart: plan.plannedStart,
    plannedEnd: plan.plannedEnd,
    isOwner: plan.userId === user._id,
    tasks: ordered.map(toPlanBlockTask),
  }
}

// Create one of the caller's planBlocks. A member may keep several blocks on the
// lane, so every call inserts a new row. The optional tasks land in the same
// transaction: a refused task or block rolls every write back, so the popover
// never leaves an orphan block or task (ST-34).
export async function createPlanBlock(
  ctx: MutationCtx,
  dayStart: number,
  title: string | undefined,
  plannedStart: number,
  plannedEnd: number,
  taskIds: Id<'task'>[] = [],
  newTaskTitles: string[] = []
): Promise<void> {
  const user = await requireUser(ctx)
  const planTitle = normalizeTitle(title)
  const now = await getClockNow(ctx)
  assertValidWindow(dayStart, plannedStart, plannedEnd, now)
  await assertNoOverlap(ctx, user._id, dayStart, plannedStart, plannedEnd)
  if (taskIds.length + newTaskTitles.length > MAX_TASKS_PER_PLAN) {
    throw new Error(`A plan block can hold at most ${MAX_TASKS_PER_PLAN} tasks.`)
  }

  const planBlockId = await ctx.db.insert('planBlock', {
    userId: user._id,
    dayStart,
    ...(planTitle === undefined ? {} : { title: planTitle }),
    plannedStart,
    plannedEnd,
  })

  for (const taskId of new Set(taskIds)) await assignTask(ctx, planBlockId, taskId)
  for (const taskTitle of newTaskTitles) {
    const taskId = await createTaskForDay(ctx, user, taskTitle, dayStart, 'end')
    await assignTask(ctx, planBlockId, taskId)
  }
}

// Rename an owned planBlock and, while it has not started, move its window. The
// window keeps the stored Day; only the two instants change, so a planBlock can
// never be dragged onto another Day. Once the block has started only the title
// may change — a window edit is refused even when it would pass the other rules.
export async function updatePlanBlock(
  ctx: MutationCtx,
  planBlockId: Id<'planBlock'>,
  title: string | undefined,
  plannedStart: number,
  plannedEnd: number
): Promise<void> {
  const user = await requireUser(ctx)
  const plan = await requireOwnedPlanBlock(ctx, user, planBlockId)
  const hasTitleUpdate = title !== undefined
  const planTitle = hasTitleUpdate ? normalizeTitle(title) : undefined
  const windowChanged = plannedStart !== plan.plannedStart || plannedEnd !== plan.plannedEnd

  if (windowChanged) {
    const now = await getClockNow(ctx)
    if (now >= plan.plannedStart) {
      throw new Error('A plan block that has started cannot change its window.')
    }
    assertValidWindow(plan.dayStart, plannedStart, plannedEnd, now)
    await assertNoOverlap(ctx, user._id, plan.dayStart, plannedStart, plannedEnd, plan._id)
  }

  await ctx.db.patch(plan._id, {
    ...(hasTitleUpdate ? { title: planTitle } : {}),
    plannedStart,
    plannedEnd,
  })
}

// Put an owned, Open task into an owned block. A task picked from another Day
// moves to the block's Day first, so a plan assignment always points at a task
// on the block's Day. A task has at most one assignment to a block that has not
// ended (ADR-0012): moving it into this block drops its assignment to every other
// unended block, while an ended block keeps its row as the record of what was
// intended. The block's window decides what "unended" means, read from the server
// clock so a stale tab cannot win it.
export async function assignTask(
  ctx: MutationCtx,
  planBlockId: Id<'planBlock'>,
  taskId: Id<'task'>,
  orderedTaskIds?: Id<'task'>[]
): Promise<void> {
  const user = await requireUser(ctx)
  const plan = await requireOwnedPlanBlock(ctx, user, planBlockId)
  const task = await requireOwnedTask(ctx, user, taskId)
  const now = await getClockNow(ctx)

  if (plan.plannedEnd <= now) throw new Error('That plan has ended.')
  if (task.done) throw new Error('Only an open task can be planned.')

  if (task.plannedAt !== plan.dayStart) {
    await moveTaskToDay(ctx, user, task, plan.dayStart)
  }

  const existing = await taskAssignments(ctx, taskId)
  const isAlreadyAssigned = existing.some((assignment) => assignment.planBlockId === planBlockId)
  if (!isAlreadyAssigned) {
    for (const assignment of existing) {
      const block = await ctx.db.get(assignment.planBlockId)
      if (!block || block.plannedEnd > now) await ctx.db.delete(assignment._id)
    }

    await ctx.db.insert('planAssignment', {
      userId: user._id,
      taskId,
      planBlockId,
      dayStart: plan.dayStart,
    })
  }

  if (orderedTaskIds !== undefined) {
    await reorderTasks(ctx, plan.dayStart, orderedTaskIds)
  }
}

// The stored popover's create-and-attach: one mutation writes the Task and its
// assignment, so a refusal leaves neither behind.
export async function assignNewTask(
  ctx: MutationCtx,
  planBlockId: Id<'planBlock'>,
  title: string
): Promise<void> {
  const user = await requireUser(ctx)
  const plan = await requireOwnedPlanBlock(ctx, user, planBlockId)
  const now = await getClockNow(ctx)
  if (plan.plannedEnd <= now) throw new Error('That plan has ended.')

  const taskId = await createTaskForDay(ctx, user, title, plan.dayStart, 'end')
  await assignTask(ctx, planBlockId, taskId)
}

// Detach an owned task from an owned block. A live block still accepts the edit;
// a past block is the record and never loses a row.
export async function unassignTask(
  ctx: MutationCtx,
  planBlockId: Id<'planBlock'>,
  taskId: Id<'task'>,
  orderedTaskIds?: Id<'task'>[]
): Promise<void> {
  const user = await requireUser(ctx)
  const plan = await requireOwnedPlanBlock(ctx, user, planBlockId)
  await requireOwnedTask(ctx, user, taskId)
  const now = await getClockNow(ctx)

  if (plan.plannedEnd <= now) throw new Error('A plan that has ended keeps its tasks.')

  const assignments = await taskAssignments(ctx, taskId)
  const assignment = assignments.find((row) => row.planBlockId === planBlockId)
  if (assignment) await ctx.db.delete(assignment._id)

  if (orderedTaskIds !== undefined) {
    await reorderTasks(ctx, plan.dayStart, orderedTaskIds)
  }
}

// Delete an owned planBlock that has not started, dropping its assignments. The
// tasks stay on their Day. A started block is part of the Day's record and cannot
// be removed; the popup hides the action for it too.
export async function removePlanBlock(
  ctx: MutationCtx,
  planBlockId: Id<'planBlock'>
): Promise<void> {
  const user = await requireUser(ctx)
  const plan = await requireOwnedPlanBlock(ctx, user, planBlockId)
  const now = await getClockNow(ctx)
  if (now >= plan.plannedStart) {
    throw new Error('A plan block that has started cannot be removed.')
  }

  const assignments = await ctx.db
    .query('planAssignment')
    .withIndex('by_planBlockId', (q) => q.eq('planBlockId', planBlockId))
    .take(MAX_TASKS_PER_PLAN)
  for (const assignment of assignments) await ctx.db.delete(assignment._id)

  await ctx.db.delete(plan._id)
}

// The first grain at or after `now`, inside the planBlock's Day. A planBlock
// never starts in the past; one for a future Day may start at its midnight.
export function planFloor(dayStart: number, now: number): number {
  return dayStart + Math.max(0, Math.ceil((now - dayStart) / PLAN_GRAIN_MS)) * PLAN_GRAIN_MS
}

// The window rules every write shares: inside one Day, positive, on the 15-minute
// grid, and never starting in the past.
function assertValidWindow(
  dayStart: number,
  plannedStart: number,
  plannedEnd: number,
  now: number
): void {
  const dayEnd = nextDayStart(dayStart, DASHBOARD_TIME_ZONE)
  if (startOfDay(dayStart, DASHBOARD_TIME_ZONE) !== dayStart) {
    throw new Error('A plan block belongs to a Day.')
  }
  if (plannedStart >= plannedEnd) throw new Error('A plan block needs a positive length.')
  if (plannedStart < dayStart || plannedEnd > dayEnd) {
    throw new Error('A plan block must stay inside its Day.')
  }
  if (
    (plannedStart - dayStart) % PLAN_GRAIN_MS !== 0 ||
    (plannedEnd - dayStart) % PLAN_GRAIN_MS !== 0
  ) {
    throw new Error('A plan block must sit on a 15-minute mark.')
  }
  if (plannedStart < planFloor(dayStart, now)) {
    throw new Error('A plan block cannot start in the past.')
  }
}

// A planBlock may touch another at its edges, but never overlap it. The check is
// per member and per Day; `excludeId` lets a resize ignore the row being resized.
async function assertNoOverlap(
  ctx: MutationCtx,
  userId: Id<'users'>,
  dayStart: number,
  plannedStart: number,
  plannedEnd: number,
  excludeId?: Id<'planBlock'>
): Promise<void> {
  const existing = await ctx.db
    .query('planBlock')
    .withIndex('by_userId_dayStart', (q) => q.eq('userId', userId).eq('dayStart', dayStart))
    .take(MAX_PLANS_PER_MEMBER_DAY)
  const overlaps = existing.some(
    (plan) =>
      plan._id !== excludeId && plannedStart < plan.plannedEnd && plannedEnd > plan.plannedStart
  )
  if (overlaps) throw new Error('This plan block overlaps another plan block.')
}

async function requireUser(ctx: MutationCtx): Promise<Doc<'users'>> {
  const user = await getMe(ctx)
  if (!user) throw new Error('Not authenticated')
  return user
}

// A blank title means "unnamed": the lane falls back to the window instead.
function normalizeTitle(title: string | undefined): string | undefined {
  const trimmed = title?.trim()
  return trimmed ? trimmed : undefined
}

// Same error for missing or someone else's planBlock: never leak that it exists.
async function requireOwnedPlanBlock(
  ctx: MutationCtx,
  user: Doc<'users'>,
  planBlockId: Id<'planBlock'>
): Promise<Doc<'planBlock'>> {
  const plan = await ctx.db.get(planBlockId)
  if (!plan || plan.userId !== user._id) throw new Error('Plan block not found')
  return plan
}

// Same error as the tasks domain, so a missing task and someone else's task are
// indistinguishable here too.
async function requireOwnedTask(
  ctx: MutationCtx,
  user: Doc<'users'>,
  taskId: Id<'task'>
): Promise<Doc<'task'>> {
  const task = await ctx.db.get(taskId)
  if (!task || task.userId !== user._id) throw new Error('Task not found')
  return task
}

async function taskAssignments(
  ctx: QueryCtx | MutationCtx,
  taskId: Id<'task'>
): Promise<Doc<'planAssignment'>[]> {
  return await ctx.db
    .query('planAssignment')
    .withIndex('by_taskId', (q) => q.eq('taskId', taskId))
    .take(MAX_ASSIGNMENTS_PER_TASK)
}

function toPlanBlockTask(task: Doc<'task'>): PlanBlockTask {
  return {
    id: task._id,
    title: task.title,
    done: task.done,
    completedAt: task.completedAt ?? null,
  }
}
