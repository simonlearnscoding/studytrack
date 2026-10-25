import { query } from './_generated/server'
import {
  getBoards as readBoards,
  getLeaderboardTableForViewer as readLeaderboardTableForViewer,
} from './leaderboard/service'
import { getBoardsArgs, getLeaderboardTableForViewerArgs } from './leaderboard/types'

// Thin entry: authenticate and delegate. All ranking lives in ./leaderboard.
export const getBoards = query({
  args: getBoardsArgs.fields,
  handler: async (ctx, args) => readBoards(ctx, args),
})

// The web's comparison read: gated by Clerk identity instead of the bot secret
// (see ./leaderboard/service).
export const getLeaderboardTableForViewer = query({
  args: getLeaderboardTableForViewerArgs.fields,
  handler: async (ctx, args) => readLeaderboardTableForViewer(ctx, args),
})
