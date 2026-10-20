import { mutation } from './_generated/server'
import { createOrMovePlan } from './plannedSessions/service'
import { createOrMovePlanArgs } from './plannedSessions/types'

// Thin entry: handlers only delegate to ./plannedSessions/service.
export const createOrMove = mutation({
  args: createOrMovePlanArgs.fields,
  handler: async (ctx, args) => {
    await createOrMovePlan(ctx, args.dayStart, args.plannedStart, args.plannedEnd)
  },
})
