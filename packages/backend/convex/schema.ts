import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { studyMode } from './bot/types'

export default defineSchema({
  // A person. Created by the bot from the Discord id when first seen; the Clerk
  // sign-in later fills in `clerkUserId` and the profile fields.
  users: defineTable({
    clerkUserId: v.optional(v.string()),
    discordId: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_clerkUserId', ['clerkUserId'])
    .index('by_discordId', ['discordId']),

  // A study stint: from joining a channel until leaving voice. Partials hang off
  // it. For now every voice channel counts as study, so there is no guild config.
  session: defineTable({
    discordId: v.string(),
    userId: v.optional(v.id('users')),
    guildId: v.string(),
    status: v.union(v.literal('active'), v.literal('ended')),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index('by_status', ['status'])
    .index('by_discordId', ['discordId', 'status']),

  // One row per stretch of time in a single state: same channel, same camera /
  // screen-share mode. Belongs to exactly one session (FK below).
  sessionPartial: defineTable({
    sessionId: v.id('session'),
    discordId: v.string(),
    userId: v.optional(v.id('users')),
    guildId: v.string(),
    // Absent for a `break` partial — there is no channel during the gap.
    channelId: v.optional(v.string()),
    mode: studyMode,
    status: v.union(v.literal('active'), v.literal('ended')),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
  })
    .index('by_sessionId', ['sessionId', 'status'])
    .index('by_status', ['status'])
    .index('by_discordId', ['discordId', 'status'])
    .index('by_userId', ['userId', 'startedAt'])
    .index('by_startedAt', ['startedAt']),
})
