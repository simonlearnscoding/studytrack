import { internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { rollupDay } from './dailyTotals/service'
import { DASHBOARD_TIME_ZONE, startOfDay } from './workSessions/util'

// Destructive maintenance: wipe every planBlock. A one-off reset for dev
// or a rule change (e.g. before overlap prevention shipped). Internal only —
// CLI/dashboard, never a client.
export const clearPlanBlocks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const planBlocks = await ctx.db.query('planBlock').collect()
    for (const planBlock of planBlocks) await ctx.db.delete(planBlock._id)
    return { deletedPlanBlocks: planBlocks.length }
  },
})

// Destructive maintenance: delete one member's chosen workSessions (and their
// partials), then re-roll every affected closed Day so the dailyTotal cache
// stops counting the removed time. Internal only — CLI/dashboard, never a
// client. Takes the member's discordId plus the exact workSession ids to remove.
export const removeMemberWorkSessions = internalMutation({
  args: { discordId: v.string(), workSessionIds: v.array(v.id('workSession')) },
  handler: async (ctx, args) => {
    const wanted = new Set(args.workSessionIds)
    const dayStarts = new Set<number>()

    const partials = await ctx.db
      .query('workSessionPartial')
      .withIndex('by_discordId', (q) => q.eq('discordId', args.discordId))
      .collect()

    for (const p of partials) {
      if (!wanted.has(p.workSessionId)) continue
      dayStarts.add(startOfDay(p.startedAt, DASHBOARD_TIME_ZONE))
      await ctx.db.delete(p._id)
    }

    let deletedWorkSessions = 0
    for (const id of args.workSessionIds) {
      const workSession = await ctx.db.get(id)
      if (!workSession || workSession.discordId !== args.discordId) continue
      dayStarts.add(startOfDay(workSession.startedAt, DASHBOARD_TIME_ZONE))
      await ctx.db.delete(id)
      deletedWorkSessions += 1
    }

    const todayStart = startOfDay(Date.now(), DASHBOARD_TIME_ZONE)
    let rerolled = 0
    for (const dayStart of dayStarts) {
      if (dayStart >= todayStart) continue
      await rollupDay(ctx, dayStart)
      rerolled += 1
    }

    return { deletedWorkSessions, deletedPartials: partials.length, rerolled }
  },
})
