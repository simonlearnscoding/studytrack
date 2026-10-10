import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'

export const get = query({
  args: { guildId: v.string() },
  handler: async (ctx, { guildId }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    return await ctx.db
      .query('guildSettings')
      .withIndex('by_guildId', (q) => q.eq('guildId', guildId))
      .unique()
  },
})

// Sets which voice channels count as study channels for a server.
export const setStudyChannels = mutation({
  args: { guildId: v.string(), channelIds: v.array(v.string()) },
  handler: async (ctx, { guildId, channelIds }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const existing = await ctx.db
      .query('guildSettings')
      .withIndex('by_guildId', (q) => q.eq('guildId', guildId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { studyChannelIds: channelIds, updatedAt: Date.now() })
      return existing._id
    }
    return await ctx.db.insert('guildSettings', {
      guildId,
      studyChannelIds: channelIds,
      updatedAt: Date.now(),
    })
  },
})

// Setup helper with no auth, so it can be run from the CLI/dashboard before
// the web UI exists. Run from the repo root:
//   npx convex run guildSettings:adminSetStudyChannels '{"guildId":"<id>","channelIds":["<id>"]}'
export const adminSetStudyChannels = internalMutation({
  args: { guildId: v.string(), channelIds: v.array(v.string()) },
  handler: async (ctx, { guildId, channelIds }) => {
    const existing = await ctx.db
      .query('guildSettings')
      .withIndex('by_guildId', (q) => q.eq('guildId', guildId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { studyChannelIds: channelIds, updatedAt: Date.now() })
      return existing._id
    }
    return await ctx.db.insert('guildSettings', {
      guildId,
      studyChannelIds: channelIds,
      updatedAt: Date.now(),
    })
  },
})
