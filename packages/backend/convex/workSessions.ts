import { internalMutation, query } from './_generated/server'
import { v } from 'convex/values'
import {
  closeStale as closeStaleWorkSessions,
  getTodaysActivitiesForDashboard as getTodaysActivities,
  listActive as listActiveWorkSessions,
  listRecent as listRecentWorkSessions,
} from './workSessions/service'

// Thin entry: handlers only delegate to ./workSessions/service.
export const listActive = query({
  args: {},
  handler: async (ctx) => listActiveWorkSessions(ctx),
})

export const listRecent = query({
  args: {},
  handler: async (ctx) => listRecentWorkSessions(ctx),
})

// One card per member for the dashboard. `dayStart` (epoch ms, the start of the
// shared calendar day) is supplied by the caller because queries must not read
// the wall clock. See `workSessions/util` for `startOfDay` and `DASHBOARD_TIME_ZONE`.
export const getTodaysActivitiesForDashboard = query({
  args: { dayStart: v.number() },
  handler: async (ctx, args) => getTodaysActivities(ctx, args.dayStart),
})

export const closeStale = internalMutation({
  args: {},
  handler: async (ctx) => closeStaleWorkSessions(ctx),
})
