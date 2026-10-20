import { mutation } from './_generated/server'
import { createPlan } from './plannedSessions/service'
import { createPlanArgs } from './plannedSessions/types'

// Thin entry: handlers only delegate to ./plannedSessions/service.
export const create = mutation({
  args: createPlanArgs.fields,
  handler: async (ctx, args) => {
    await createPlan(ctx, args.dayStart, args.plannedStart, args.plannedEnd)
  },
})
