import { mutation, query } from './_generated/server'
import {
  clearActive as clearActiveTask,
  createTask,
  getActive as readActive,
  listMine as readMine,
  removeTask,
  renameTask,
  reorderTasks,
  rescheduleTask,
  setActive as setActiveTask,
  toggleTask,
} from './tasks/service'
import {
  clearActiveArgs,
  createTaskArgs,
  listMineArgs,
  removeTaskArgs,
  renameTaskArgs,
  reorderTasksArgs,
  rescheduleTaskArgs,
  setActiveTaskArgs,
  toggleTaskArgs,
} from './tasks/types'

// Thin entry: wire args, delegate. Auth and db work live in ./tasks/service; the
// arg validators and the view type live in ./tasks/types.
// TODO: list mine what?? rename?
export const listMine = query({
  args: listMineArgs.fields,
  handler: async (ctx, args) => readMine(ctx, args.dayStart),
})

export const create = mutation({
  args: createTaskArgs.fields,
  handler: async (ctx, args) => {
    await createTask(ctx, args.title, args.plannedAt, args.placement)
  },
})

export const toggle = mutation({
  args: toggleTaskArgs.fields,
  handler: async (ctx, args) => {
    await toggleTask(ctx, args.taskId)
  },
})

export const rename = mutation({
  args: renameTaskArgs.fields,
  handler: async (ctx, args) => {
    await renameTask(ctx, args.taskId, args.title)
  },
})

export const remove = mutation({
  args: removeTaskArgs.fields,
  handler: async (ctx, args) => {
    await removeTask(ctx, args.taskId)
  },
})

export const reorder = mutation({
  args: reorderTasksArgs.fields,
  handler: async (ctx, args) => {
    await reorderTasks(ctx, args.dayStart, args.orderedTaskIds)
  },
})

export const reschedule = mutation({
  args: rescheduleTaskArgs.fields,
  handler: async (ctx, args) => {
    await rescheduleTask(ctx, args.taskId, args.plannedAt)
  },
})

export const getActive = query({
  args: {},
  handler: async (ctx) => readActive(ctx),
})

export const setActive = mutation({
  args: setActiveTaskArgs.fields,
  handler: async (ctx, args) => {
    await setActiveTask(ctx, args.taskId)
  },
})

export const clearActive = mutation({
  args: clearActiveArgs.fields,
  handler: async (ctx) => {
    await clearActiveTask(ctx)
  },
})
