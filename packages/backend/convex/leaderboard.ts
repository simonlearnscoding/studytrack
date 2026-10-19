import { query } from './_generated/server'
import {
  getBoards as readBoards,
  getBoardsForViewer as readBoardsForViewer,
} from './leaderboard/service'
import { getBoardsArgs, getBoardsForViewerArgs } from './leaderboard/types'

// Thin entry: authenticate and delegate. All ranking lives in ./leaderboard.
export const getBoards = query({
  args: getBoardsArgs.fields,
  handler: async (ctx, args) => readBoards(ctx, args),
})

// The web's board read: the same three lists, gated by Clerk identity instead of
// the bot secret (see ./leaderboard/service).
export const getBoardsForViewer = query({
  args: getBoardsForViewerArgs.fields,
  handler: async (ctx, args) => readBoardsForViewer(ctx, args),
})
