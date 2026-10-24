import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { DASHBOARD_TIME_ZONE, nextDayStart, startOfDay } from '../workSessions/util'
import { getMe } from '../users/service'

// The planning grid: the drag snaps to quarters, so the backend only accepts
// marks on the same grain.
export const PLAN_GRAIN_MS = 15 * 60 * 1000

// Bounded overlap read: a member's planBlocks for one Day sit far below this.
const MAX_PLANS_PER_MEMBER_DAY = 200

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

// The first grain at or after `now`, inside the planBlock's Day. A planBlock
// never starts in the past; one for a future Day may start at its midnight.
export function planFloor(dayStart: number, now: number): number {
  return dayStart + Math.max(0, Math.ceil((now - dayStart) / PLAN_GRAIN_MS)) * PLAN_GRAIN_MS
}

// Create one of the caller's planBlocks. A member may keep several blocks on the
// lane, so every call inserts a new row.
export async function createPlanBlock(
  ctx: MutationCtx,
  dayStart: number,
  plannedStart: number,
  plannedEnd: number
): Promise<void> {
  const user = await requireUser(ctx)
  assertValidWindow(dayStart, plannedStart, plannedEnd)
  await assertNoOverlap(ctx, user._id, dayStart, plannedStart, plannedEnd)

  await ctx.db.insert('planBlock', { userId: user._id, dayStart, plannedStart, plannedEnd })
}

// Move one edge of an owned planBlock. The window keeps the stored Day; only the
// two instants change, so a planBlock can never be dragged onto another Day.
export async function updatePlanBlock(
  ctx: MutationCtx,
  planBlockId: Id<'planBlock'>,
  plannedStart: number,
  plannedEnd: number
): Promise<void> {
  const user = await requireUser(ctx)
  const plan = await requireOwnedPlanBlock(ctx, user, planBlockId)

  assertValidWindow(plan.dayStart, plannedStart, plannedEnd)
  await assertNoOverlap(ctx, user._id, plan.dayStart, plannedStart, plannedEnd, plan._id)

  await ctx.db.patch(plan._id, { plannedStart, plannedEnd })
}

// Delete an owned planBlock. Missing and someone else's rows share the same error.
export async function removePlanBlock(
  ctx: MutationCtx,
  planBlockId: Id<'planBlock'>
): Promise<void> {
  const user = await requireUser(ctx)
  const plan = await requireOwnedPlanBlock(ctx, user, planBlockId)
  await ctx.db.delete(plan._id)
}

// The window rules every write shares: inside one Day, positive, on the 15-minute
// grid, and never starting in the past.
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
    (plannedStart - dayStart) % PLAN_GRAIN_MS !== 0 ||
    (plannedEnd - dayStart) % PLAN_GRAIN_MS !== 0
  ) {
    throw new Error('A plan block must sit on a 15-minute mark.')
  }
  if (plannedStart < planFloor(dayStart, Date.now())) {
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
