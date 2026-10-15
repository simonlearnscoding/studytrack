import { internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { rollupDay } from './dailyTotals/service'
import { DASHBOARD_TIME_ZONE, startOfDay } from './sessions/util'

// Destructive maintenance: delete one member's chosen sessions (and their
// partials), then re-roll every affected closed Day so the dailyTotal cache
// stops counting the removed time. Internal only — CLI/dashboard, never a
// client. Takes the member's discordId plus the exact session ids to remove.
export const removeMemberSessions = internalMutation({
  args: { discordId: v.string(), sessionIds: v.array(v.id('session')) },
  handler: async (ctx, args) => {
    const wanted = new Set(args.sessionIds)
    const dayStarts = new Set<number>()

    const partials = await ctx.db
      .query('sessionPartial')
      .withIndex('by_discordId', (q) => q.eq('discordId', args.discordId))
      .collect()

    for (const p of partials) {
      if (!wanted.has(p.sessionId)) continue
      dayStarts.add(startOfDay(p.startedAt, DASHBOARD_TIME_ZONE))
      await ctx.db.delete(p._id)
    }

    let deletedSessions = 0
    for (const id of args.sessionIds) {
      const session = await ctx.db.get(id)
      if (!session || session.discordId !== args.discordId) continue
      dayStarts.add(startOfDay(session.startedAt, DASHBOARD_TIME_ZONE))
      await ctx.db.delete(id)
      deletedSessions += 1
    }

    const todayStart = startOfDay(Date.now(), DASHBOARD_TIME_ZONE)
    let rerolled = 0
    for (const dayStart of dayStarts) {
      if (dayStart >= todayStart) continue
      await rollupDay(ctx, dayStart)
      rerolled += 1
    }

    return { deletedSessions, deletedPartials: partials.length, rerolled }
  },
})
