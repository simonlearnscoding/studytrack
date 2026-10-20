import { internalMutation, query } from './_generated/server'
import {
  backfill as runBackfill,
  getCalendar as readCalendar,
  listMine as readMine,
  rollupDay as runRollupDay,
  rollupRecent as runRollupRecent,
} from './dailyTotals/service'
import { backfillArgs, getCalendarArgs, listMineArgs, rollupDayArgs } from './dailyTotals/types'

// The caller's own Daily totals, for the web heatmap and Streak. Authenticated by
// identity in the service; another member's rows are never returned.
export const listMine = query({
  args: listMineArgs.fields,
  handler: async (ctx, args) => readMine(ctx, args.fromDayStart),
})

// The private month calendar read: one Month of the caller's Daily totals plus
// today's live row. See ST-28.
export const getCalendar = query({
  args: getCalendarArgs.fields,
  handler: async (ctx, args) => {
    return await readCalendar(ctx, args.fromDayStart, args.toDayStart, args.now)
  },
})

// Thin entry: the rest is internal. The bot's weekly/monthly boards build on the
// read helpers in the service. See ST-11.
export const rollupDay = internalMutation({
  args: rollupDayArgs.fields,
  handler: async (ctx, args) => {
    await runRollupDay(ctx, args.dayStart)
  },
})

export const rollupRecent = internalMutation({
  args: {},
  handler: async (ctx) => {
    await runRollupRecent(ctx)
  },
})

export const backfill = internalMutation({
  args: backfillArgs.fields,
  handler: async (ctx, args) => {
    await runBackfill(ctx, args.dayStart)
  },
})
