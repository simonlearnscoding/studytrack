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

// The two instants every board is computed against: the focus day the caller
// selected (its Europe/Zurich midnight, epoch ms) and the caller's clock. The
// service derives today's Day and the focus day's Week and Month from these, so
// queries never read the wall clock (see ../sessions/util).
const boardArgs = {
  now: v.number(),
  focusDayStart: v.number(),
}

// The bot's read: the focus day plus the shared bot secret. It passes the focus
// day = today, so its three boards behave exactly as before.
export const getBoardsArgs = v.object({
  secret: v.string(),
  ...boardArgs,
})

// The web's read of the same three lists for a signed-in member. No secret — the
// service gates it on the Clerk identity instead.
export const getBoardsForViewerArgs = v.object(boardArgs)

export type GetBoardsArgs = Infer<typeof getBoardsArgs>
export type GetBoardsForViewerArgs = Infer<typeof getBoardsForViewerArgs>
