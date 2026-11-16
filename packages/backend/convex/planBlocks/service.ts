import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { getClockNow } from '../devClock/service'
import { insertTaskInDayQueue, moveTaskToDay, replaceDayTaskOrder } from '../tasks/service'
import { byQueueOrder } from '../tasks/util'
import { getMe } from '../users/service'
import { DASHBOARD_TIME_ZONE, nextDayStart, startOfDay } from '../workSessions/util'
import type { PlanBlockDetail, PlanBlockTask } from './types'
import { PLAN_BLOCK_GRAIN_MS, planFloor } from './util'

// Bounded reads: a member's planBlocks for one Day sit far below this.
const MAX_PLANS_PER_MEMBER_DAY = 200
const MAX_TASKS_PER_PLAN = 200

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

  const blockTasks = await ctx.db
    .query('task')
    .withIndex('by_planBlockId', (q) => q.eq('planBlockId', planBlockId))
    .take(MAX_TASKS_PER_PLAN)
  const ordered = [...blockTasks].sort(byQueueOrder)

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
): Promise<Id<'planBlock'>> {
  const user = await requireUser(ctx)
  const planTitle = normalizeTitle(title)
  const now = await getClockNow(ctx)
  assertValidWindow(dayStart, plannedStart, plannedEnd)
  if (plannedStart < planFloor(dayStart, now)) {
    throw new Error('A plan block cannot start in the past.')
  }
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
    const taskId = await insertTaskInDayQueue(ctx, user, taskTitle, dayStart, 'end')
    await assignTask(ctx, planBlockId, taskId)
  }

  return planBlockId
}

// Rename an owned planBlock and move its window. The window keeps the stored Day;
// only the two instants change, so a planBlock can never be dragged onto another
// Day. A block that has started or ended moves, resizes and renames like any
// other: the plan is an intention, not a record (ADR-0015).
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
    assertValidWindow(plan.dayStart, plannedStart, plannedEnd)
    await assertNoOverlap(ctx, user._id, plan.dayStart, plannedStart, plannedEnd, plan._id)
  }

  await ctx.db.patch(plan._id, {
    ...(hasTitleUpdate ? { title: planTitle } : {}),
    plannedStart,
    plannedEnd,
  })
}

// Put an owned, Open task into an owned block. A task picked from another Day
// moves to the block's Day first, so the link always points at a task on the
// block's Day. Planning the task again replaces the link; the block it leaves
// keeps nothing about it (ADR-0015).
export async function assignTask(
  ctx: MutationCtx,
  planBlockId: Id<'planBlock'>,
  taskId: Id<'task'>,
  orderedTaskIds?: Id<'task'>[]
): Promise<void> {
  const user = await requireUser(ctx)
  const plan = await requireOwnedPlanBlock(ctx, user, planBlockId)
  const task = await requireOwnedTask(ctx, user, taskId)

  if (task.done) throw new Error('Only an open task can be planned.')

  if (task.plannedAt !== plan.dayStart) {
    await moveTaskToDay(ctx, user, task, plan.dayStart)
  }
  await ctx.db.patch(task._id, { planBlockId })

  if (orderedTaskIds !== undefined) {
    await replaceDayTaskOrder(ctx, plan.dayStart, orderedTaskIds)
  }
}

// The stored popover's create-and-attach: one mutation writes the Task and its
// link, so a refusal leaves neither behind.
export async function assignNewTask(
  ctx: MutationCtx,
  planBlockId: Id<'planBlock'>,
  title: string
): Promise<void> {
  const user = await requireUser(ctx)
  const plan = await requireOwnedPlanBlock(ctx, user, planBlockId)

  const taskId = await insertTaskInDayQueue(ctx, user, title, plan.dayStart, 'end')
  await assignTask(ctx, planBlockId, taskId)
}

// Detach an owned task from an owned block, at any phase. The task stays on the
// Day and keeps its queue position.
export async function unassignTask(
  ctx: MutationCtx,
  planBlockId: Id<'planBlock'>,
  taskId: Id<'task'>,
  orderedTaskIds?: Id<'task'>[]
): Promise<void> {
  const user = await requireUser(ctx)
  const plan = await requireOwnedPlanBlock(ctx, user, planBlockId)
  const task = await requireOwnedTask(ctx, user, taskId)

  if (task.planBlockId === planBlockId) {
    await ctx.db.patch(task._id, { planBlockId: undefined })
  }

  if (orderedTaskIds !== undefined) {
    await replaceDayTaskOrder(ctx, plan.dayStart, orderedTaskIds)
  }
}

// Delete an owned planBlock at any phase, unplanning its tasks. They stay on their
// Day in their queue positions; nothing keeps a copy of what the block held.
export async function removePlanBlock(
  ctx: MutationCtx,
  planBlockId: Id<'planBlock'>
): Promise<void> {
  const user = await requireUser(ctx)
  const plan = await requireOwnedPlanBlock(ctx, user, planBlockId)
  const blockTasks = await ctx.db
    .query('task')
    .withIndex('by_planBlockId', (q) => q.eq('planBlockId', planBlockId))
    .take(MAX_TASKS_PER_PLAN)
  for (const task of blockTasks) await ctx.db.patch(task._id, { planBlockId: undefined })

  await ctx.db.delete(plan._id)
}

// The window rules every write shares: inside one Day, positive, and on the
// 15-minute grid the drag snaps to. A window may cover time that has passed: a
// block can be moved to where it should have been.
function assertValidWindow(dayStart: number, plannedStart: number, plannedEnd: number): void {
  const dayEnd = nextDayStart(dayStart, DASHBOARD_TIME_ZONE)
  if (startOfDay(dayStart, DASHBOARD_TIME_ZONE) !== dayStart) {
    throw new Error('A plan block belongs to a Day.')
  }
  if (plannedStart >= plannedEnd) throw new Error('A plan block needs a positive length.')
  if (plannedStart < dayStart || plannedEnd > dayEnd) {
    throw new Error('A plan block must stay inside its Day.')
  }
  if (
    (plannedStart - dayStart) % PLAN_BLOCK_GRAIN_MS !== 0 ||
    (plannedEnd - dayStart) % PLAN_BLOCK_GRAIN_MS !== 0
  ) {
    throw new Error('A plan block must sit on a 15-minute mark.')
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

function toPlanBlockTask(task: Doc<'task'>): PlanBlockTask {
  return {
    id: task._id,
    title: task.title,
    done: task.done,
    completedAt: task.completedAt ?? null,
  }
}
