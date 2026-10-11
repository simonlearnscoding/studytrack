import type { MutationCtx, QueryCtx } from '../_generated/server'
import type { UpsertFromClerkArgs } from './types'

// The signed-in user's row, or null.
export async function getMe(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return await ctx.db
    .query('users')
    .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
    .unique()
}

// Creates or updates the caller's row. The `clerkUserId` always comes from the
// verified identity — never from the arguments — so it cannot be spoofed.
export async function upsertFromClerk(ctx: MutationCtx, args: UpsertFromClerkArgs) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error('Not authenticated')

  const existing = await ctx.db
    .query('users')
    .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
    .unique()

  if (existing) {
    await ctx.db.patch(existing._id, {
      discordId: args.discordId ?? existing.discordId,
      name: args.name ?? existing.name,
      image: args.image ?? existing.image,
    })
    return existing._id
  }

  return await ctx.db.insert('users', {
    clerkUserId: identity.subject,
    discordId: args.discordId,
    name: args.name,
    image: args.image,
    createdAt: Date.now(),
  })
}
