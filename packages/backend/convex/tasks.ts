import { mutation, query } from './_generated/server'
import {
  createTask,
  listMine as readMine,
  removeTask,
  renameTask,
  toggleTask,
} from './tasks/service'
import {
  createTaskArgs,
  listMineArgs,
  removeTaskArgs,
  renameTaskArgs,
  toggleTaskArgs,
} from './tasks/types'

// Thin entry: wire args, delegate. Auth and db work live in ./tasks/service; the
// arg validators and the view type live in ./tasks/types.
export const listMine = query({
  args: listMineArgs.fields,
  handler: async (ctx, args) => readMine(ctx, args.dayStart),
})

export const create = mutation({
  args: createTaskArgs.fields,
  handler: async (ctx, args) => {
    await createTask(ctx, args.title)
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
