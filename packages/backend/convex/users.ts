import { mutation, query } from './_generated/server'
import { getMe, upsertFromClerk as applyUpsert } from './users/service'
import { upsertFromClerkArgs } from './users/types'

// Thin entry: the handler only wires args to logic. All auth and db work lives
// in ./users/service; the payload validators live in ./users/types.
export const me = query({
  args: {},
  handler: async (ctx) => getMe(ctx),
})

export const upsertFromClerk = mutation({
  args: upsertFromClerkArgs.fields,
  handler: async (ctx, args) => applyUpsert(ctx, args),
})
