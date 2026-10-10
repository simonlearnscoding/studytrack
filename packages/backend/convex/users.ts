import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// The signed-in user, or null. Callers get this from any component via
// `useQuery(convexQuery(api.users.me, {}))`.
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    return await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
      .unique()
  },
})

// Creates or updates the caller's row. The `clerkUserId` always comes from the
// verified identity — never from the arguments — so it cannot be spoofed.
export const upsertFromClerk = mutation({
  args: {
    discordId: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
  },
})
