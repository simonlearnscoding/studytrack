import { v } from 'convex/values'
import { mutation } from './_generated/server'

// Constant-time compare so the shared secret can't be guessed by timing.
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// The bot is a trusted external service: it authenticates with a shared secret
// (Convex's documented service-auth pattern). The bot only reports raw voice
// events — all the "does this open or close a session?" logic lives here.
export const recordVoiceEvent = mutation({
  args: {
    secret: v.string(),
    discordId: v.string(),
    guildId: v.string(),
    fromChannelId: v.union(v.string(), v.null()),
    toChannelId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const expected = process.env.BOT_SHARED_SECRET
    if (!expected || !safeEqual(args.secret, expected)) throw new Error('Unauthorized')

    const settings = await ctx.db
      .query('guildSettings')
      .withIndex('by_guildId', (q) => q.eq('guildId', args.guildId))
      .unique()
    if (!settings) return { ignored: 'no-guild-config' as const }

    const study = new Set(settings.studyChannelIds)
    const wasInStudy = args.fromChannelId !== null && study.has(args.fromChannelId)
    const isInStudy = args.toChannelId !== null && study.has(args.toChannelId)

    const linkUser = async () => {
      const user = await ctx.db
        .query('users')
        .withIndex('by_discordId', (q) => q.eq('discordId', args.discordId))
        .first()
      return user?._id
    }

    // Left (or moved out of) a study channel → close any active session.
    if (wasInStudy && !isInStudy) {
      const active = await ctx.db
        .query('studySessions')
        .withIndex('by_discordId', (q) => q.eq('discordId', args.discordId).eq('status', 'active'))
        .collect()
      const now = Date.now()
      for (const session of active) {
        await ctx.db.patch(session._id, {
          status: 'ended',
          endedAt: now,
          durationMs: now - session.startedAt,
        })
      }
      return { ended: active.length }
    }

    // Entered a study channel → open a session (unless one is already open).
    if (!wasInStudy && isInStudy && args.toChannelId) {
      const existing = await ctx.db
        .query('studySessions')
        .withIndex('by_discordId', (q) => q.eq('discordId', args.discordId).eq('status', 'active'))
        .first()
      if (existing) return { ignored: 'already-active' as const }

      await ctx.db.insert('studySessions', {
        discordId: args.discordId,
        userId: await linkUser(),
        guildId: args.guildId,
        channelId: args.toChannelId,
        status: 'active',
        startedAt: Date.now(),
      })
      return { started: true }
    }

    return { ignored: 'no-op' as const }
  },
})
