import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { getClockNow } from '../devClock/service'
import { DASHBOARD_TIME_ZONE, startOfDay } from '../workSessions/util'
import { getMe } from '../users/service'
import type { ActiveTask, DayTask, NowCandidates, Task, TaskPlacement, TaskPlan } from './types'
import { buildNowCandidates, byQueueOrder, insertionIndex, planOrder } from './util'

const MAX_DAY_TASKS = 200
const MAX_DAY_PLANS = 200
const MAX_ASSIGNMENTS_PER_TASK = 200
const MAX_SEARCH_RESULTS = 20
const DEFAULT_SEARCH_RESULTS = 8

// The caller's tasks **planned for one Day**, in manual order. A task with no
// explicit position (written before the field existed) falls back to creation
// order, so the list reads as it did before the first drag. Task content is
// public (docs/adr/0007), so the room may read titles; ownership still gates
// writes. The caller supplies the Day start, so the query never reads the wall
// clock.
export async function listMyDayTasks(ctx: QueryCtx, dayStart: number): Promise<DayTask[]> {
  const user = await getMe(ctx)
  if (!user) return []

  const dayTaskRows = await readDayTaskRows(ctx, user._id, dayStart)
  const plansByTaskId = await readDayTaskPlans(ctx, user._id, dayStart)
  return dayTaskRows.map((taskRow) => ({
    ...toTaskView(taskRow),
    plan: plansByTaskId.get(taskRow._id) ?? null,
  }))
}

// The caller's Open Tasks matching a title search, across every Day. Backed by
// the task table's search index, so it is ranked and bounded; a blank query
// returns nothing (the popover shows the block Day's queue before typing).
export async function searchOpenTasks(
  ctx: QueryCtx,
  query: string,
  limit = DEFAULT_SEARCH_RESULTS
): Promise<Task[]> {
  const user = await getMe(ctx)
  const searchTerm = query.trim()
  if (!user || !searchTerm) return []

  const cappedLimit = Math.min(Math.max(limit, 1), MAX_SEARCH_RESULTS)
  const matchedTaskRows = await ctx.db
    .query('task')
    .withSearchIndex('search_title', (q) =>
      q.search('title', searchTerm).eq('userId', user._id).eq('done', false)
    )
    .take(cappedLimit)
  return matchedTaskRows.map(toTaskView)
}

// Add a task planned for the Day the caller is viewing. `end` (the default)
// appends it; `now` puts it on top so it becomes Now; `next` puts it right after
// the current Now. Rejects an empty title.
export async function createDayTask(
  ctx: MutationCtx,
  title: string,
  plannedAt: number,
  placement: TaskPlacement = 'end'
): Promise<void> {
  const user = await requireUser(ctx)
  await insertTaskInDayQueue(ctx, user, title, plannedAt, placement)
}

// The insert shared by the task composer and the plan popover's create-and-
// attach. The Day and title rules live here so both writers agree.
export async function insertTaskInDayQueue(
  ctx: MutationCtx,
  user: Doc<'users'>,
  title: string,
  plannedAt: number,
  placement: TaskPlacement = 'end'
): Promise<Id<'task'>> {
  const taskTitle = title.trim()
  if (!taskTitle) throw new Error('A task needs a title.')
  if (startOfDay(plannedAt, DASHBOARD_TIME_ZONE) !== plannedAt) {
    throw new Error('A task is planned for a Day, not a time.')
  }

  const dayTaskRows = await readDayTaskRows(ctx, user._id, plannedAt)
  if (placement === 'end') {
    const bottomPosition = nextFreePosition(dayTaskRows)
    return await ctx.db.insert('task', {
      userId: user._id,
      title: taskTitle,
      done: false,
      plannedAt,
      ...(bottomPosition === null ? {} : { position: bottomPosition }),
    })
  }

  const insertionPosition = insertionIndex(dayTaskRows, placement)
  // Give the new task room at `insertionPosition`. Every task from there down
  // shifts one place, which also positions legacy unpositioned tasks on the way.
  for (let position = dayTaskRows.length - 1; position >= insertionPosition; position--) {
    await ctx.db.patch(dayTaskRows[position]._id, { position: position + 1 })
  }
  for (let position = 0; position < insertionPosition; position++) {
    if (dayTaskRows[position].position !== position) {
      await ctx.db.patch(dayTaskRows[position]._id, { position })
    }
  }
  return await ctx.db.insert('task', {
    userId: user._id,
    title: taskTitle,
    done: false,
    plannedAt,
    position: insertionPosition,
  })
}

// Replace the manual order of one Day. The ids must be the caller's own tasks of
// that Day; anything else fails as "not found" and nothing is written. Tasks the
// caller did not send (added on another device mid-drag) keep their order after
// the ones they did.
export async function replaceDayTaskOrder(
  ctx: MutationCtx,
  dayStart: number,
  orderedTaskIds: Id<'task'>[]
): Promise<void> {
  const user = await requireUser(ctx)
  if (new Set(orderedTaskIds).size !== orderedTaskIds.length) {
    throw new Error('A task cannot appear twice in the new order.')
  }

  const dayTaskRows = await readDayTaskRows(ctx, user._id, dayStart)
  const taskRowsInNewOrder = planOrder(dayTaskRows, orderedTaskIds)

  for (const [queuePosition, taskRow] of taskRowsInNewOrder.entries()) {
    if (taskRow.position === queuePosition) continue
    await ctx.db.patch(taskRow._id, { position: queuePosition })
  }
}

// Move one owned task to another Day, at the bottom of that Day's queue. A live
// plan cannot follow it: the block belongs to the old Day, so the unended
// assignment is dropped. Assignments to blocks that have ended stay as the
// record. Both Days' live queries update by themselves.
export async function moveOwnedTaskToDay(
  ctx: MutationCtx,
  taskId: Id<'task'>,
  plannedAt: number
): Promise<void> {
  const user = await requireUser(ctx)
  if (startOfDay(plannedAt, DASHBOARD_TIME_ZONE) !== plannedAt) {
    throw new Error('A task is planned for a Day, not a time.')
  }

  const ownedTask = await requireOwnedTask(ctx, user, taskId)
  await moveTaskToDay(ctx, user, ownedTask, plannedAt)
}

// The move shared by the task row's reschedule and the plan picker's cross-Day
// pick: the task lands at the bottom of the target Day, and only ended-block
// assignments survive as the record of what was intended.
export async function moveTaskToDay(
  ctx: MutationCtx,
  user: Doc<'users'>,
  taskRow: Doc<'task'>,
  plannedAt: number
): Promise<void> {
  if (taskRow.plannedAt === plannedAt) return

  const nowInstant = await getClockNow(ctx)
  await dropUnendedAssignments(ctx, taskRow._id, nowInstant)

  const targetDayTaskRows = await readDayTaskRows(ctx, user._id, plannedAt)
  const appendedPosition = await resolveAppendPosition(ctx, targetDayTaskRows)
  await ctx.db.patch(taskRow._id, { plannedAt, position: appendedPosition })
}

// Flip a task between Open and Done. A live completion — the box ticked while the
// member was viewing today — stamps `completedAt`; a retrospective one leaves it
// absent, because when the work happened is unknown. Completing clears the active
// pointer when this was the active task; reopening never restores it.
export async function toggleTaskDone(
  ctx: MutationCtx,
  taskId: Id<'task'>,
  focusDayStart: number
): Promise<void> {
  const user = await requireUser(ctx)
  const ownedTask = await requireOwnedTask(ctx, user, taskId)
  if (startOfDay(focusDayStart, DASHBOARD_TIME_ZONE) !== focusDayStart) {
    throw new Error('The Focus day must be a Day start.')
  }

  const isNowDone = !ownedTask.done
  // The browser knows which Day it is showing; the server owns the wall clock. A
  // completion gets an instant only when those agree, so ticking a past Day's
  // task never drops a dot on today (ADR-0010). The dev clock moves both sides
  // of that comparison, so a fake today behaves exactly like a real one.
  const nowInstant = await getClockNow(ctx)
  const completionInstant =
    isNowDone && focusDayStart === startOfDay(nowInstant, DASHBOARD_TIME_ZONE)
      ? nowInstant
      : undefined
  await ctx.db.patch(taskId, { done: isNowDone, completedAt: completionInstant })
  if (isNowDone) await clearActiveTaskIfMatches(ctx, user, taskId)
}

// Rename a task (Open or Done) so a typo or a Done record can be corrected.
// Rejects an empty title with the same error `create` uses.
export async function renameTask(
  ctx: MutationCtx,
  taskId: Id<'task'>,
  title: string
): Promise<void> {
  const user = await requireUser(ctx)
  const correctedTitle = title.trim()
  if (!correctedTitle) throw new Error('A task needs a title.')
  const ownedTask = await requireOwnedTask(ctx, user, taskId)

  await ctx.db.patch(ownedTask._id, { title: correctedTitle })
}

// Hard-delete the caller's task, Open or Done, and drop the active pointer when it
// pointed at this task. Its plan assignments go with it: a hard-deleted task has
// no title left to show, so it cannot be a past block's record. Ownership is
// checked, so another member's task never leaks its existence.
export async function deleteTask(ctx: MutationCtx, taskId: Id<'task'>): Promise<void> {
  const user = await requireUser(ctx)
  const ownedTask = await requireOwnedTask(ctx, user, taskId)

  const taskPlanAssignments = await ctx.db
    .query('planAssignment')
    .withIndex('by_taskId', (q) => q.eq('taskId', taskId))
    .take(MAX_ASSIGNMENTS_PER_TASK)
  for (const planAssignment of taskPlanAssignments) {
    await ctx.db.delete(planAssignment._id)
  }

  await ctx.db.delete(ownedTask._id)
  await clearActiveTaskIfMatches(ctx, user, taskId)
}

// Point the caller's NOW at an owned, Open task. Setting the task that is already
// active keeps its original `activeSince`.
export async function setActiveTask(ctx: MutationCtx, taskId: Id<'task'>): Promise<void> {
  const user = await requireUser(ctx)
  const ownedTask = await requireOwnedTask(ctx, user, taskId)
  if (ownedTask.done) throw new Error('Only an open task can be active.')

  const activeSinceInstant =
    user.activeTaskId === taskId && user.activeSince !== undefined ? user.activeSince : Date.now()
  await ctx.db.patch(user._id, { activeTaskId: taskId, activeSince: activeSinceInstant })
}

// Explicitly clear the active pointer. Idempotent.
export async function clearActiveTask(ctx: MutationCtx): Promise<void> {
  const user = await requireUser(ctx)
  await clearActiveTaskPointer(ctx, user._id)
}

// The caller's Now inputs, clock-free (ST-35): the ticking client picks from
// these with its own clock, so crossing a plan boundary does not re-subscribe
// this read. Null when signed out.
export async function getNowCandidates(
  ctx: QueryCtx,
  dayStart: number
): Promise<NowCandidates | null> {
  const user = await getMe(ctx)
  if (!user) return null

  const [dayTaskRows, plansByTaskId] = await Promise.all([
    readDayTaskRows(ctx, user._id, dayStart),
    readDayTaskPlans(ctx, user._id, dayStart),
  ])
  return buildNowCandidates(dayTaskRows, plansByTaskId)
}

// The caller's active task, or null when there is no pointer, the pointed task is
// gone, or the caller is unauthenticated.
export async function getActiveTask(ctx: QueryCtx): Promise<ActiveTask | null> {
  const user = await getMe(ctx)
  if (!user || !user.activeTaskId || user.activeSince === undefined) return null

  const activeTaskRow = await ctx.db.get(user.activeTaskId)
  if (!activeTaskRow || activeTaskRow.userId !== user._id) return null

  return { task: toTaskView(activeTaskRow), activeSince: user.activeSince }
}

// A Day's tasks, bounded and in queue order (Open before Done, then manual
// position). Newest-first at the read so the cap keeps the most recent tasks
// when a Day is over it.
async function readDayTaskRows(
  ctx: QueryCtx,
  userId: Id<'users'>,
  dayStart: number
): Promise<Doc<'task'>[]> {
  const newestTaskRows = await ctx.db
    .query('task')
    .withIndex('by_userId_plannedAt', (q) => q.eq('userId', userId).eq('plannedAt', dayStart))
    .order('desc')
    .take(MAX_DAY_TASKS)
  return newestTaskRows.sort(byQueueOrder)
}

// The newest assignment per task for the Day. A task can only gain a newer one
// after its previous block ended, so the newest row is the task's current plan;
// the ticking view checks the window to decide whether it is still current. Two
// reads cover the whole Day — never one query per row. Shared with the dashboard
// reads so Now and the row chip cannot disagree about which block is current.
export async function readDayTaskPlans(
  ctx: QueryCtx,
  userId: Id<'users'>,
  dayStart: number
): Promise<Map<Id<'task'>, TaskPlan>> {
  const planAssignments = await ctx.db
    .query('planAssignment')
    .withIndex('by_userId_dayStart', (q) => q.eq('userId', userId).eq('dayStart', dayStart))
    .order('desc')
    .take(MAX_DAY_PLANS)
  if (planAssignments.length === 0) return new Map()

  const dayPlanBlocks = await ctx.db
    .query('planBlock')
    .withIndex('by_userId_dayStart', (q) => q.eq('userId', userId).eq('dayStart', dayStart))
    .take(MAX_DAY_PLANS)
  const planBlocksById = new Map(dayPlanBlocks.map((planBlock) => [planBlock._id, planBlock]))

  const plansByTaskId = new Map<Id<'task'>, TaskPlan>()
  for (const planAssignment of planAssignments) {
    if (plansByTaskId.has(planAssignment.taskId)) continue
    const planBlock = planBlocksById.get(planAssignment.planBlockId)
    if (!planBlock) continue
    plansByTaskId.set(planAssignment.taskId, {
      planBlockId: planBlock._id,
      title: planBlock.title ?? null,
      plannedStart: planBlock.plannedStart,
      plannedEnd: planBlock.plannedEnd,
    })
  }
  return plansByTaskId
}

// Drop the assignments that cannot survive a Day move. A block that has ended is
// the record of what was planned, so its row stays.
async function dropUnendedAssignments(
  ctx: MutationCtx,
  taskId: Id<'task'>,
  nowInstant: number
): Promise<void> {
  const taskPlanAssignments = await ctx.db
    .query('planAssignment')
    .withIndex('by_taskId', (q) => q.eq('taskId', taskId))
    .take(MAX_ASSIGNMENTS_PER_TASK)
  for (const planAssignment of taskPlanAssignments) {
    const planBlock = await ctx.db.get(planAssignment.planBlockId)
    if (!planBlock || planBlock.plannedEnd > nowInstant) {
      await ctx.db.delete(planAssignment._id)
    }
  }
}

// Where a new task goes. Null while the Day still holds tasks without a position:
// leaving it positionless keeps creation order and puts it at the bottom.
function nextFreePosition(dayTaskRows: Doc<'task'>[]): number | null {
  if (!dayTaskRows.every((taskRow) => taskRow.position !== undefined)) return null
  const highestPosition = dayTaskRows.reduce(
    (highest, taskRow) => Math.max(highest, taskRow.position ?? -1),
    -1
  )
  return highestPosition + 1
}

// The position that appends to an existing Day. A Day written before positions
// existed is normalised first, so a moved task still lands at the bottom instead
// of sorting by its old creation instant.
async function resolveAppendPosition(
  ctx: MutationCtx,
  dayTaskRows: Doc<'task'>[]
): Promise<number> {
  const freePosition = nextFreePosition(dayTaskRows)
  if (freePosition !== null) return freePosition
  for (const [queuePosition, taskRow] of dayTaskRows.entries()) {
    if (taskRow.position !== queuePosition) {
      await ctx.db.patch(taskRow._id, { position: queuePosition })
    }
  }
  return dayTaskRows.length
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
  const taskRow = await ctx.db.get(taskId)
  if (!taskRow || taskRow.userId !== user._id) throw new Error('Task not found')
  return taskRow
}

// Clear the pointer only when it still points at this task, so completing or
// deleting side work never drops the caller's focus.
async function clearActiveTaskIfMatches(
  ctx: MutationCtx,
  user: Doc<'users'>,
  taskId: Id<'task'>
): Promise<void> {
  if (user.activeTaskId !== taskId) return
  await clearActiveTaskPointer(ctx, user._id)
}

async function clearActiveTaskPointer(ctx: MutationCtx, userId: Id<'users'>): Promise<void> {
  await ctx.db.patch(userId, { activeTaskId: undefined, activeSince: undefined })
}

function toTaskView(taskRow: Doc<'task'>): Task {
  return {
    id: taskRow._id,
    title: taskRow.title,
    done: taskRow.done,
    completedAt: taskRow.completedAt ?? null,
    plannedAt: taskRow.plannedAt,
  }
}
