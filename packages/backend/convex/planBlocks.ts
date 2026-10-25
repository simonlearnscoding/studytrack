import { mutation, query } from './_generated/server'
import {
  assignTask,
  createPlanBlock,
  getWithTasks as readPlanBlockWithTasks,
  listMine as listMyPlanBlocks,
  removePlanBlock,
  unassignTask,
  updatePlanBlock,
} from './planBlocks/service'
import {
  createPlanBlockArgs,
  listMyPlanBlocksArgs,
  planBlockDetailArgs,
  planTaskArgs,
  removePlanBlockArgs,
  updatePlanBlockArgs,
} from './planBlocks/types'

// Thin entry: handlers only delegate to ./planBlocks/service.
export const listMine = query({
  args: listMyPlanBlocksArgs.fields,
  handler: async (ctx, args) => listMyPlanBlocks(ctx, args.dayStart),
})

// The stored popover's live read: one block and its tasks, public to viewers.
export const getWithTasks = query({
  args: planBlockDetailArgs.fields,
  handler: async (ctx, args) => readPlanBlockWithTasks(ctx, args.planBlockId),
})

export const assign = mutation({
  args: planTaskArgs.fields,
  handler: async (ctx, args) => {
    await assignTask(ctx, args.planBlockId, args.taskId)
  },
})

export const unassign = mutation({
  args: planTaskArgs.fields,
  handler: async (ctx, args) => {
    await unassignTask(ctx, args.planBlockId, args.taskId)
  },
})

export const create = mutation({
  args: createPlanBlockArgs.fields,
  handler: async (ctx, args) => {
    await createPlanBlock(ctx, args.dayStart, args.title, args.plannedStart, args.plannedEnd)
  },
})

// One write path for both a rename and the planning gestures: moving the body
// and dragging an edge both replace the planBlock's two endpoints.
export const update = mutation({
  args: updatePlanBlockArgs.fields,
  handler: async (ctx, args) => {
    await updatePlanBlock(ctx, args.planBlockId, args.title, args.plannedStart, args.plannedEnd)
  },
})

export const remove = mutation({
  args: removePlanBlockArgs.fields,
  handler: async (ctx, args) => {
    await removePlanBlock(ctx, args.planBlockId)
  },
})
