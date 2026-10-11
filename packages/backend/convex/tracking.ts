import { mutation, query } from './_generated/server'
import { getMine as readMine, startManual, stopManual } from './tracking/service'

// Thin entry: authenticate and delegate. All decision + db work lives in
// ./tracking/service; the view type lives in ./tracking/types.
export const getMine = query({
  args: {},
  handler: async (ctx) => readMine(ctx),
})

export const start = mutation({
  args: {},
  handler: async (ctx) => {
    await startManual(ctx)
  },
})

export const stop = mutation({
  args: {},
  handler: async (ctx) => {
    await stopManual(ctx)
  },
})
