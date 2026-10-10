import { internalMutation, query } from './_generated/server'

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000

// Everyone currently in a study channel. Live — the dashboard subscribes to it.
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    return await ctx.db
      .query('studySessions')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect()
  },
})

// Most recent finished/active sessions, newest first.
export const listRecent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    return await ctx.db.query('studySessions').order('desc').take(25)
  },
})

// Safety net: a forgotten session (e.g. the bot restarted while someone was
// connected) is closed after 8 hours instead of counting forever.
export const closeStale = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const active = await ctx.db
      .query('studySessions')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect()

    let closed = 0
    for (const session of active) {
      if (now - session.startedAt > EIGHT_HOURS_MS) {
        await ctx.db.patch(session._id, {
          status: 'ended',
          endedAt: now,
          durationMs: now - session.startedAt,
        })
        closed += 1
      }
    }
    return closed
  },
})
