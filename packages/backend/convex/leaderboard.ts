import { query } from './_generated/server'
import { getBoards as readBoards } from './leaderboard/service'
import { getBoardsArgs } from './leaderboard/types'

// Thin entry: authenticate and delegate. All ranking lives in ./leaderboard.
export const getBoards = query({
  args: getBoardsArgs.fields,
  handler: async (ctx, args) => readBoards(ctx, args),
})
