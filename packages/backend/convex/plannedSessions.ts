import { mutation } from './_generated/server'
import { createPlan, updatePlan } from './plannedSessions/service'
import { createPlanArgs, updatePlanArgs } from './plannedSessions/types'

// Thin entry: handlers only delegate to ./plannedSessions/service.
export const create = mutation({
  args: createPlanArgs.fields,
  handler: async (ctx, args) => {
    await createPlan(ctx, args.dayStart, args.plannedStart, args.plannedEnd)
  },
})

// One write path for both gestures: moving the body and dragging an edge both
// replace the plan's two endpoints.
export const update = mutation({
  args: updatePlanArgs.fields,
  handler: async (ctx, args) => {
    await updatePlan(ctx, args.planId, args.plannedStart, args.plannedEnd)
  },
})
