import { internalMutation, query } from './_generated/server'
import { v } from 'convex/values'
import {
  closeStale as closeStaleSessions,
  getTodaysActivitiesForDashboard as getTodaysActivities,
  listActive as listActiveSessions,
  listRecent as listRecentSessions,
} from './sessions/service'

// Thin entry: handlers only delegate to ./sessions/service.
export const listActive = query({
  args: {},
  handler: async (ctx) => listActiveSessions(ctx),
})

export const listRecent = query({
  args: {},
  handler: async (ctx) => listRecentSessions(ctx),
})

// One card per member for the dashboard. `dayStart` (epoch ms, the start of the
// shared calendar day) is supplied by the caller because queries must not read
// the wall clock. See `sessions/util` for `startOfDay` and `DASHBOARD_TIME_ZONE`.
export const getTodaysActivitiesForDashboard = query({
  args: { dayStart: v.number() },
  handler: async (ctx, args) => getTodaysActivities(ctx, args.dayStart),
})

export const closeStale = internalMutation({
  args: {},
  handler: async (ctx) => closeStaleSessions(ctx),
})
