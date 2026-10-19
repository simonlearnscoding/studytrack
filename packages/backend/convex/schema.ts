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
  // A manual stint (started on the web) has no guild, and its member may have no
  // Discord id, so both are optional.
  session: defineTable({
    discordId: v.optional(v.string()),
    userId: v.optional(v.id('users')),
    guildId: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('ended')),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index('by_status', ['status'])
    .index('by_discordId', ['discordId', 'status'])
    .index('by_userId', ['userId', 'status']),

  // One row per stretch of time in a single state: same channel, same camera /
  // screen-share mode. Belongs to exactly one session (FK below).
  sessionPartial: defineTable({
    sessionId: v.id('session'),
    discordId: v.optional(v.string()),
    userId: v.optional(v.id('users')),
    guildId: v.optional(v.string()),
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

  // One closed Day's totals for one member (see GLOSSARY: Daily total, Study
  // time, Deep focus, Total time). A cron keeps these current; readers sum them
  // instead of rescanning raw partials. The member key follows the same rule the
  // dashboard and bot use: `discordId ?? String(userId)`, so manual and Discord
  // time land in one row per person per Day.
  dailyTotal: defineTable({
    memberKey: v.string(),
    discordId: v.optional(v.string()),
    userId: v.optional(v.id('users')),
    dayStart: v.number(),
    studyMs: v.number(),
    deepFocusMs: v.number(),
    totalMs: v.number(),
  })
    .index('by_dayStart', ['dayStart'])
    .index('by_memberKey', ['memberKey', 'dayStart']),

  // An item on a member's study list. Task content is public (docs/adr/0007):
  // titles, the active task and the up-next suggestion all show in the room.
  // Only the owner writes it. `completedAt` is set when the task is marked done
  // and cleared when it is reopened.
  task: defineTable({
    userId: v.id('users'),
    title: v.string(),
    done: v.boolean(),
    completedAt: v.optional(v.number()),
  }).index('by_userId', ['userId']),

  // The motivational quote shown in the site header, one per local Day. A cron
  // fetches it from ZenQuotes once a Day and stores it here, so readers never hit
  // the network (see quotes/). `dayStart` is the local midnight (Europe/Zurich).
  dailyQuote: defineTable({
    dayStart: v.number(),
    text: v.string(),
    author: v.string(),
  }).index('by_dayStart', ['dayStart']),
})
