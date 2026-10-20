import type { MutationCtx } from '../_generated/server'
import { DASHBOARD_TIME_ZONE, nextDayStart, startOfDay } from '../sessions/util'
import { getMe } from '../users/service'

// The planning grid: the drag snaps to quarters, so the backend only accepts
// marks on the same grain.
export const PLAN_GRAIN_MS = 15 * 60 * 1000

// Bounded overlap read: a member's plans for one Day sit far below this.
const MAX_PLANS_PER_MEMBER_DAY = 200

// The first grain at or after `now`, inside the plan's Day. A plan never starts
// in the past; a plan for a future Day may start at its midnight.
export function planFloor(dayStart: number, now: number): number {
  return dayStart + Math.max(0, Math.ceil((now - dayStart) / PLAN_GRAIN_MS)) * PLAN_GRAIN_MS
}

// Create one of the caller's plans. A member may keep several blocks on the
// lane, so every call inserts a new row.
export async function createPlan(
  ctx: MutationCtx,
  dayStart: number,
  plannedStart: number,
  plannedEnd: number
): Promise<void> {
  const user = await getMe(ctx)
  if (!user) throw new Error('Not authenticated')

  const dayEnd = nextDayStart(dayStart, DASHBOARD_TIME_ZONE)
  if (startOfDay(dayStart, DASHBOARD_TIME_ZONE) !== dayStart) {
    throw new Error('A plan belongs to a Day.')
  }
  if (plannedStart >= plannedEnd) throw new Error('A plan needs a positive length.')
  if (plannedStart < dayStart || plannedEnd > dayEnd) {
    throw new Error('A plan must stay inside its Day.')
  }
  if (
    (plannedStart - dayStart) % PLAN_GRAIN_MS !== 0 ||
    (plannedEnd - dayStart) % PLAN_GRAIN_MS !== 0
  ) {
    throw new Error('A plan must sit on a 15-minute mark.')
  }
  if (plannedStart < planFloor(dayStart, Date.now())) {
    throw new Error('A plan cannot start in the past.')
  }

  // A new block may touch an existing one at its edges, but never overlap it.
  // The check is per member and per Day; adjacent plans share a boundary.
  const existing = await ctx.db
    .query('plannedSession')
    .withIndex('by_userId_dayStart', (q) => q.eq('userId', user._id).eq('dayStart', dayStart))
    .take(MAX_PLANS_PER_MEMBER_DAY)
  const overlaps = existing.some(
    (plan) => plannedStart < plan.plannedEnd && plannedEnd > plan.plannedStart
  )
  if (overlaps) throw new Error('This plan overlaps another plan.')

  await ctx.db.insert('plannedSession', { userId: user._id, dayStart, plannedStart, plannedEnd })
}
