import { internalMutation, query } from './_generated/server'
import {
  closeStale as closeStaleSessions,
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

export const closeStale = internalMutation({
  args: {},
  handler: async (ctx) => closeStaleSessions(ctx),
})
