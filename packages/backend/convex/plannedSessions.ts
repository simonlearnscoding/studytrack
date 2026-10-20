import { mutation } from './_generated/server'
import { createPlan, resizePlan } from './plannedSessions/service'
import { createPlanArgs, resizePlanArgs } from './plannedSessions/types'

// Thin entry: handlers only delegate to ./plannedSessions/service.
export const create = mutation({
  args: createPlanArgs.fields,
  handler: async (ctx, args) => {
    await createPlan(ctx, args.dayStart, args.plannedStart, args.plannedEnd)
  },
})

export const resize = mutation({
  args: resizePlanArgs.fields,
  handler: async (ctx, args) => {
    await resizePlan(ctx, args.planId, args.plannedStart, args.plannedEnd)
  },
})
