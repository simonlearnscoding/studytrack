import { v, type Infer } from 'convex/values'
import type { Id } from '../_generated/dataModel'

// One row of a leaderboard, already ranked and capped by ./util. The bot renders
// these directly and does no ranking of its own.
export type LeaderboardRow = {
  discordId: string
  name: string | null
  deepFocusMs: number
  totalMs: number
  online: boolean
}

// A row before names are resolved: it carries the owning user so the service can
// look up names for the ranked top ten only.
export type LeaderboardTotal = LeaderboardRow & { userId: Id<'users'> | null }

// The three lists the bot shows in one message.
export type LeaderboardBoards = {
  today: LeaderboardRow[]
  week: LeaderboardRow[]
  month: LeaderboardRow[]
}

// The bot supplies every timestamp because queries must not read the wall clock
// (see ../sessions/util); `secret` is the shared bot secret.
export const getBoardsArgs = v.object({
  secret: v.string(),
  now: v.number(),
  dayStart: v.number(),
  weekStart: v.number(),
  monthStart: v.number(),
})

export type GetBoardsArgs = Infer<typeof getBoardsArgs>
