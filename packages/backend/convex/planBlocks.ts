import { mutation, query } from './_generated/server'
import {
  createPlanBlock,
  listMine as listMyPlanBlocks,
  removePlanBlock,
  updatePlanBlock,
} from './planBlocks/service'
import {
  createPlanBlockArgs,
  listMyPlanBlocksArgs,
  removePlanBlockArgs,
  updatePlanBlockArgs,
} from './planBlocks/types'

// Thin entry: handlers only delegate to ./planBlocks/service.
export const listMine = query({
  args: listMyPlanBlocksArgs.fields,
  handler: async (ctx, args) => listMyPlanBlocks(ctx, args.dayStart),
})

export const create = mutation({
  args: createPlanBlockArgs.fields,
  handler: async (ctx, args) => {
    await createPlanBlock(ctx, args.dayStart, args.plannedStart, args.plannedEnd)
  },
})

// One write path for both gestures: moving the body and dragging an edge both
// replace the planBlock's two endpoints.
export const update = mutation({
  args: updatePlanBlockArgs.fields,
  handler: async (ctx, args) => {
    await updatePlanBlock(ctx, args.planBlockId, args.plannedStart, args.plannedEnd)
  },
})

export const remove = mutation({
  args: removePlanBlockArgs.fields,
  handler: async (ctx, args) => {
    await removePlanBlock(ctx, args.planBlockId)
  },
})
