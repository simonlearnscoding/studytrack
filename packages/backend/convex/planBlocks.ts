import { mutation, query } from './_generated/server'
import { requireMe } from './users/service'
import {
  assignNewTask,
  assignTask,
  createPlanBlock,
  getWithTasks as readPlanBlockWithTasks,
  listMine as listMyPlanBlocks,
  removePlanBlock,
  unassignTask,
  updatePlanBlock,
} from './planBlocks/service'
import {
  assignNewTaskArgs,
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

// Writes resolve the member at the door and hand it to the service, so the
// domain code starts at the rule it enforces instead of the auth preamble. Reads
// keep returning null/[] for a signed-out caller (a mutation throws instead).
export const assign = mutation({
  args: planTaskArgs.fields,
  handler: async (ctx, args) => {
    const user = await requireMe(ctx)
    await assignTask(ctx, user, args.planBlockId, args.taskId, args.orderedTaskIds)
  },
})

export const unassign = mutation({
  args: planTaskArgs.fields,
  handler: async (ctx, args) => {
    const user = await requireMe(ctx)
    await unassignTask(ctx, user, args.planBlockId, args.taskId, args.orderedTaskIds)
  },
})

// Create-and-attach: a new Task on the block's Day plus its link, one write.
export const assignNew = mutation({
  args: assignNewTaskArgs.fields,
  handler: async (ctx, args) => {
    const user = await requireMe(ctx)
    await assignNewTask(ctx, user, args.planBlockId, args.title)
  },
})

export const create = mutation({
  args: createPlanBlockArgs.fields,
  handler: async (ctx, args) => {
    const user = await requireMe(ctx)
    return await createPlanBlock(
      ctx,
      user,
      args.dayStart,
      args.title,
      args.plannedStart,
      args.plannedEnd,
      args.taskIds ?? [],
      args.newTaskTitles ?? []
    )
  },
})

// One write path for both a rename and the planning gestures: moving the body
// and dragging an edge both replace the planBlock's two endpoints.
export const update = mutation({
  args: updatePlanBlockArgs.fields,
  handler: async (ctx, args) => {
    const user = await requireMe(ctx)
    await updatePlanBlock(
      ctx,
      user,
      args.planBlockId,
      args.title,
      args.plannedStart,
      args.plannedEnd
    )
  },
})

export const remove = mutation({
  args: removePlanBlockArgs.fields,
  handler: async (ctx, args) => {
    const user = await requireMe(ctx)
    await removePlanBlock(ctx, user, args.planBlockId)
  },
})
