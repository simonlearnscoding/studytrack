import type { MutationCtx } from '../_generated/server'
import { DASHBOARD_TIME_ZONE, nextDayStart, startOfDay } from '../sessions/util'
import { getMe } from '../users/service'

// The planning grid: the drag snaps to quarters, so the backend only accepts
// marks on the same grain.
export const PLAN_GRAIN_MS = 15 * 60 * 1000

// The first grain at or after `now`, inside the plan's Day. A plan never starts
// in the past; a plan for a future Day may start at its midnight.
export function planFloor(dayStart: number, now: number): number {
  return dayStart + Math.max(0, Math.ceil((now - dayStart) / PLAN_GRAIN_MS)) * PLAN_GRAIN_MS
}

// Create the caller's plan, or move the one they already have. The constraint is
// one per member, not per Day, so there is never a second row.
export async function createOrMovePlan(
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

  const existing = await ctx.db
    .query('plannedSession')
    .withIndex('by_userId', (q) => q.eq('userId', user._id))
    .unique()
  const window = { dayStart, plannedStart, plannedEnd }

  if (existing) await ctx.db.patch(existing._id, window)
  else await ctx.db.insert('plannedSession', { userId: user._id, ...window })
}
