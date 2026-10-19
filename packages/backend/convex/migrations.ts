import { internalMutation } from './_generated/server'
import { DASHBOARD_TIME_ZONE, startOfDay } from './sessions/util'

// One-off ST-27 migration: tasks created before `plannedAt` existed are planned
// for the Europe/Zurich Day of their creation instant. Idempotent; safe to rerun.
// Run while `plannedAt` is temporarily optional, then restore the required schema.
export const backfillTaskPlannedAt = internalMutation({
  args: {},
  handler: async (ctx) => {
    let patched = 0
    for await (const task of ctx.db.query('task')) {
      if (Object.hasOwn(task, 'plannedAt')) continue
      await ctx.db.patch(task._id, {
        plannedAt: startOfDay(task._creationTime, DASHBOARD_TIME_ZONE),
      })
      patched += 1
    }
    return { patched }
  },
})
