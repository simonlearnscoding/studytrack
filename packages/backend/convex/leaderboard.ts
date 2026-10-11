import { query } from './_generated/server'
import { getToday as readLeaderboard } from './leaderboard/service'
import { getTodayArgs } from './leaderboard/types'

// Thin entry: authenticate and delegate. All ranking lives in ./leaderboard.
export const getToday = query({
  args: getTodayArgs.fields,
  handler: async (ctx, args) => readLeaderboard(ctx, args),
})
