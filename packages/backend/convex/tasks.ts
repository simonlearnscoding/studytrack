import { mutation, query } from './_generated/server'
import {
  clearActiveTask,
  createDayTask,
  deleteTask,
  getActiveTask,
  getNowCandidates,
  listMyDayTasks,
  moveOwnedTaskToDay,
  renameTask,
  replaceDayTaskOrder,
  searchOpenTasks,
  setActiveTask,
  toggleTaskDone,
} from './tasks/service'
import {
  clearActiveArgs,
  createTaskArgs,
  listMineArgs,
  removeTaskArgs,
  renameTaskArgs,
  reorderTasksArgs,
  rescheduleTaskArgs,
  searchTasksArgs,
  setActiveTaskArgs,
  toggleTaskArgs,
} from './tasks/types'

// Thin entry: wire args, delegate. Auth and db work live in ./tasks/service; the
// arg validators and the view type live in ./tasks/types.
export const listMine = query({
  args: listMineArgs.fields,
  handler: async (ctx, args) => listMyDayTasks(ctx, args.dayStart),
})

export const getNow = query({
  args: listMineArgs.fields,
  handler: async (ctx, args) => getNowCandidates(ctx, args.dayStart),
})

// The plan popover's title search over the caller's Open Tasks, across Days.
export const search = query({
  args: searchTasksArgs.fields,
  handler: async (ctx, args) => searchOpenTasks(ctx, args.query, args.limit),
})

export const create = mutation({
  args: createTaskArgs.fields,
  handler: async (ctx, args) => {
    await createDayTask(ctx, args.title, args.plannedAt, args.placement)
  },
})

export const toggle = mutation({
  args: toggleTaskArgs.fields,
  handler: async (ctx, args) => {
    await toggleTaskDone(ctx, args.taskId, args.focusDayStart)
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
    await deleteTask(ctx, args.taskId)
  },
})

export const reorder = mutation({
  args: reorderTasksArgs.fields,
  handler: async (ctx, args) => {
    await replaceDayTaskOrder(ctx, args.dayStart, args.orderedTaskIds)
  },
})

export const reschedule = mutation({
  args: rescheduleTaskArgs.fields,
  handler: async (ctx, args) => {
    await moveOwnedTaskToDay(ctx, args.taskId, args.plannedAt)
  },
})

export const getActive = query({
  args: {},
  handler: async (ctx) => getActiveTask(ctx),
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
