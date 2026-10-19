import { v } from 'convex/values'
import type { MutationCtx } from '../_generated/server'
import { internalMutation } from '../_generated/server'

const MIN = 60 * 1000
const DAY = 24 * 60 * 60 * 1000

// Dev-only fixtures for the local deployment: a handful of members with past
// Daily totals (so the Week/Month boards and the heatmap have history) and live
// sessions today (so the Today board and the online dot light up). Every entry
// point is guarded by DEV_AUTH_BYPASS, which prod never sets.
const MEMBERS = [
  { discordId: '900000000000000001', name: 'Ada Lovelace', weight: 1 },
  { discordId: '900000000000000002', name: 'Alan Turing', weight: 0.85 },
  { discordId: '900000000000000003', name: 'Grace Hopper', weight: 0.7 },
  { discordId: '900000000000000004', name: 'Blaise Pascal', weight: 0.55 },
  { discordId: '900000000000000005', name: 'Katherine Johnson', weight: 0.4 },
  { discordId: '900000000000000006', name: 'Linus Torvalds', weight: 0.25 },
]

// `todayStart` and `now` come from the caller because the fixtures must line up
// with the Day/Week/Month boundaries the web computes for its own timezone.
export const seedArgs = v.object({
  todayStart: v.number(),
  now: v.number(),
  days: v.optional(v.number()),
})

// Wipe and repopulate the study tables. Run with:
//   npx convex run dev/seed:seed '{"todayStart":<ms>,"now":<ms>,"days":60}'
export const seed = internalMutation({
  args: seedArgs.fields,
  handler: async (ctx, args) => {
    assertDev()
    const days = args.days ?? 60
    await wipe(ctx)

    const userIds = await Promise.all(
      MEMBERS.map((member) =>
        ctx.db.insert('users', {
          discordId: member.discordId,
          name: member.name,
          createdAt: args.todayStart - days * DAY,
        })
      )
    )

    // One Daily total per member per past Day, with occasional rest days and a
    // deterministic wobble so the boards and heatmap have varied, stable shape.
    for (let d = days; d >= 1; d--) {
      const dayStart = args.todayStart - d * DAY
      for (let i = 0; i < MEMBERS.length; i++) {
        if ((d + i) % 4 === 0) continue
        const member = MEMBERS[i]
        const studyMs = Math.round(member.weight * (45 + ((d * 13 + i * 7) % 120)) * MIN)
        await ctx.db.insert('dailyTotal', {
          memberKey: member.discordId,
          discordId: member.discordId,
          userId: userIds[i],
          dayStart,
          studyMs,
          deepFocusMs: Math.round(studyMs * (0.35 + ((d + i) % 4) * 0.18)),
          totalMs: Math.round(studyMs * 1.25),
        })
      }
    }

    // Today: the top few members are mid-session, so the Today board is live and
    // some rows carry the online dot.
    for (let i = 0; i < Math.min(4, MEMBERS.length); i++) {
      const member = MEMBERS[i]
      const sessionStart = args.now - (i + 1) * 40 * MIN
      const sessionId = await ctx.db.insert('session', {
        discordId: member.discordId,
        userId: userIds[i],
        guildId: 'dev-guild',
        status: 'active',
        startedAt: sessionStart,
      })
      await ctx.db.insert('sessionPartial', {
        sessionId,
        discordId: member.discordId,
        userId: userIds[i],
        guildId: 'dev-guild',
        channelId: 'dev-channel',
        mode: i === 1 ? 'voice' : 'camera',
        status: 'ended',
        startedAt: sessionStart,
        endedAt: sessionStart + 15 * MIN,
        durationMs: 15 * MIN,
      })
      await ctx.db.insert('sessionPartial', {
        sessionId,
        discordId: member.discordId,
        userId: userIds[i],
        guildId: 'dev-guild',
        channelId: 'dev-channel',
        mode: i === 2 ? 'screenShare' : 'cameraAndScreenShare',
        status: 'active',
        startedAt: sessionStart + 15 * MIN,
      })
    }

    return { members: MEMBERS.length, days }
  },
})

// Empty the study tables without reseeding. Run with `npx convex run dev/seed:clear`.
export const clear = internalMutation({
  args: {},
  handler: async (ctx) => {
    assertDev()
    await wipe(ctx)
  },
})

function assertDev() {
  if (process.env.DEV_AUTH_BYPASS !== '1') {
    throw new Error('dev/seed: refusing to run without DEV_AUTH_BYPASS=1')
  }
}

async function wipe(ctx: MutationCtx) {
  for (const row of await ctx.db.query('task').collect()) await ctx.db.delete(row._id)
  for (const row of await ctx.db.query('dailyTotal').collect()) await ctx.db.delete(row._id)
  for (const row of await ctx.db.query('sessionPartial').collect()) await ctx.db.delete(row._id)
  for (const row of await ctx.db.query('session').collect()) await ctx.db.delete(row._id)
  for (const row of await ctx.db.query('users').collect()) await ctx.db.delete(row._id)
}
