import type { QueryCtx } from '../_generated/server'
import { assertBotSecret } from '../bot/util'
import { groupTodaysMembers } from '../sessions/service'
import type { GetTodayArgs, LeaderboardRow } from './types'
import { rankMembers } from './util'

// The bot's leaderboard read. It authenticates with the shared secret — it has no
// Clerk identity — and delegates ranking to ./util. `dayStart` and `now` come from
// the bot because queries must not read the wall clock.
export async function getToday(ctx: QueryCtx, args: GetTodayArgs): Promise<LeaderboardRow[]> {
  assertBotSecret(args.secret)
  const members = await groupTodaysMembers(ctx, args.dayStart)
  return rankMembers(members, args.now)
}
