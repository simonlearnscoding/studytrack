import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // A signed-in person. `clerkUserId` is the identity subject from Clerk;
  // `discordId` is filled in when we can read it from their Discord login.
  users: defineTable({
    clerkUserId: v.string(),
    discordId: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_clerkUserId', ['clerkUserId'])
    .index('by_discordId', ['discordId']),

  // Per-server config: which voice channels count as "study".
  guildSettings: defineTable({
    guildId: v.string(),
    studyChannelIds: v.array(v.string()),
    updatedAt: v.number(),
  }).index('by_guildId', ['guildId']),

  // One row per stretch of time a person spends in a study channel.
  studySessions: defineTable({
    discordId: v.string(),
    userId: v.optional(v.id('users')),
    guildId: v.string(),
    channelId: v.string(),
    status: v.union(v.literal('active'), v.literal('ended')),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
  })
    .index('by_status', ['status'])
    .index('by_discordId', ['discordId', 'status'])
    .index('by_userId', ['userId', 'startedAt']),
})
