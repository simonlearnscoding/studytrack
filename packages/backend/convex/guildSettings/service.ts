import type { MutationCtx, QueryCtx } from '../_generated/server'
import type { SetStudyChannelsArgs } from './types'

export async function getGuildSettings(ctx: QueryCtx, guildId: string) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return await ctx.db
    .query('guildSettings')
    .withIndex('by_guildId', (q) => q.eq('guildId', guildId))
    .unique()
}

// Sets which voice channels count as study channels for a server.
export async function setStudyChannels(ctx: MutationCtx, args: SetStudyChannelsArgs) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error('Not authenticated')
  return await writeStudyChannels(ctx, args)
}

// No auth, so it can be run from the CLI/dashboard before the web UI exists.
export async function adminSetStudyChannels(ctx: MutationCtx, args: SetStudyChannelsArgs) {
  return await writeStudyChannels(ctx, args)
}

// Shared upsert; each caller decides whether the caller must be authenticated.
async function writeStudyChannels(ctx: MutationCtx, { guildId, channelIds }: SetStudyChannelsArgs) {
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
}
