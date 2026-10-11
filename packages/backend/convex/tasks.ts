import { mutation, query } from './_generated/server'
import { createTask, listMine as readMine, toggleTask } from './tasks/service'
import { createTaskArgs, listMineArgs, toggleTaskArgs } from './tasks/types'

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
