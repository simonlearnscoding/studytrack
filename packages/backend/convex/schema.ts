import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { studyMode } from './bot/types'
import { metric } from './preferences/types'

export default defineSchema({
  // A person. Created by the bot from the Discord id when first seen; the Clerk
  // sign-in later fills in `clerkUserId` and the profile fields. `activeTaskId`
  // is the member's one NOW pointer, with the instant it became active.
  users: defineTable({
    clerkUserId: v.optional(v.string()),
    discordId: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    createdAt: v.number(),
    activeTaskId: v.optional(v.id('task')),
    activeSince: v.optional(v.number()),
  })
    .index('by_clerkUserId', ['clerkUserId'])
    .index('by_discordId', ['discordId']),

  // A member's own display choices. One row per member, created on the first
  // write; a missing row means the defaults in preferences/types. Each setting is
  // its own column with its own mutation, so changing one can never clear
  // another. `metric` is the site-wide Focus / Total switch (see GLOSSARY).
  preference: defineTable({
    userId: v.id('users'),
    metric,
  }).index('by_userId', ['userId']),

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
  // Only the owner writes it. `plannedAt` is the Europe/Zurich Day the task is
  // planned for (always a day start, never a time). `completedAt` is set when the
  // task is marked done and cleared when it is reopened. `plannedSessionId` is an
  // explicit "planned into this Session" link, set only with `plannedAt`.
  task: defineTable({
    userId: v.id('users'),
    title: v.string(),
    done: v.boolean(),
    completedAt: v.optional(v.number()),
    plannedAt: v.number(),
    position: v.optional(v.number()),
    plannedSessionId: v.optional(v.id('session')),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_plannedAt', ['userId', 'plannedAt'])
    .index('by_userId_completedAt', ['userId', 'completedAt'])
    .index('by_plannedSessionId', ['plannedSessionId']),

  // A member's planned session: a future block on their own lane, not a
  // Session (no voice evidence, no partials). A member may have several plans at
  // once, so each drag inserts a row instead of replacing one; plans for the same
  // member and Day may touch but never overlap.
  // `dayStart` is the Europe/Zurich Day the plan belongs to; `plannedStart` and
  // `plannedEnd` are the instants the block covers.
  plannedSession: defineTable({
    userId: v.id('users'),
    dayStart: v.number(),
    plannedStart: v.number(),
    plannedEnd: v.number(),
  })
    .index('by_userId_dayStart', ['userId', 'dayStart'])
    .index('by_dayStart', ['dayStart']),

  // The motivational quote shown in the site header, one per local Day. A cron
  // fetches it from ZenQuotes once a Day and stores it here, so readers never hit
  // the network (see quotes/). `dayStart` is the local midnight (Europe/Zurich).
  dailyQuote: defineTable({
    dayStart: v.number(),
    text: v.string(),
    author: v.string(),
  }).index('by_dayStart', ['dayStart']),
})
