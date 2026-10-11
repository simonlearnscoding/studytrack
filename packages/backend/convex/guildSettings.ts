import { internalMutation, mutation, query } from './_generated/server'
import {
  adminSetStudyChannels as applyAdminSetStudyChannels,
  getGuildSettings,
  setStudyChannels as applySetStudyChannels,
} from './guildSettings/service'
import { getGuildSettingsArgs, setStudyChannelsArgs } from './guildSettings/types'

// Thin entry: handlers only wire args to logic. All auth and db work lives in
// ./guildSettings/service; the payload validators live in ./guildSettings/types.
export const get = query({
  args: getGuildSettingsArgs.fields,
  handler: async (ctx, { guildId }) => getGuildSettings(ctx, guildId),
})

export const setStudyChannels = mutation({
  args: setStudyChannelsArgs.fields,
  handler: async (ctx, args) => applySetStudyChannels(ctx, args),
})

// Setup helper with no auth, so it can be run from the CLI/dashboard before
// the web UI exists. Run from the repo root:
//   npx convex run guildSettings:adminSetStudyChannels '{"guildId":"<id>","channelIds":["<id>"]}'
export const adminSetStudyChannels = internalMutation({
  args: setStudyChannelsArgs.fields,
  handler: async (ctx, args) => applyAdminSetStudyChannels(ctx, args),
})
