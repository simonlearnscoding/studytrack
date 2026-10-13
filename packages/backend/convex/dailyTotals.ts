import { internalMutation } from './_generated/server'
import {
  backfill as runBackfill,
  rollupDay as runRollupDay,
  rollupRecent as runRollupRecent,
} from './dailyTotals/service'
import { backfillArgs, rollupDayArgs } from './dailyTotals/types'

// Thin entry: internal only. Consumers (the weekly/monthly boards) add their own
// authenticated reads. See ST-11.
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
