import { mutation, query } from './_generated/server'
import {
  getMine,
  setDoneFolded as applySetDoneFolded,
  setMetric as applySetMetric,
} from './preferences/service'
import { setDoneFoldedArgs, setMetricArgs } from './preferences/types'

// Thin entry: the handlers only wire args to logic. Auth and db work lives in
// ./preferences/service; the arg validators and view type live in
// ./preferences/types.
export const mine = query({
  args: {},
  handler: async (ctx) => getMine(ctx),
})

export const setMetric = mutation({
  args: setMetricArgs.fields,
  handler: async (ctx, args) => {
    await applySetMetric(ctx, args.metric)
  },
})

export const setDoneFolded = mutation({
  args: setDoneFoldedArgs.fields,
  handler: async (ctx, args) => {
    await applySetDoneFolded(ctx, args.folded)
  },
})
