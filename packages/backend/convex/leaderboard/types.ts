import { v, type Infer } from 'convex/values'
import type { Id } from '../_generated/dataModel'
import type { LeaderboardPeriod } from '../preferences/types'

// One row of a leaderboard, already ranked and capped by ./util. The bot renders
// these directly and does no ranking of its own.
export type LeaderboardRow = {
  discordId: string
  name: string | null
  image: string | null
  deepFocusMs: number
  totalMs: number
  online: boolean
}

// A row before names are resolved: it carries the owning user so the service can
// look up names for the rows it actually returns.
export type LeaderboardTotal = LeaderboardRow & { userId: Id<'users'> | null }

// The four lists the service builds. `today` is the live Day (the bot's first
// board); `day` is the focus day, which equals Today when the board is on Today
// and a pure daily sum for any other day.
export type LeaderboardBoards = {
  today: LeaderboardRow[]
  day: LeaderboardRow[]
  week: LeaderboardRow[]
  month: LeaderboardRow[]
}

// The full, uncapped totals per window before the bot's lists are ranked. The web
// table is built from these, so it can keep a row's value in a period that did
// not put that member in its own top ten.
export type LeaderboardPeriodTotals = {
  today: LeaderboardTotal[]
  day: LeaderboardTotal[]
  week: LeaderboardTotal[]
  month: LeaderboardTotal[]
}

// One member's numbers in one period. Ranks are over every member, not just the
// rows returned, so the web's metric switch can lead with either metric.
export type LeaderboardCell = {
  deepFocusMs: number
  totalMs: number
  deepFocusRank: number | null
  totalRank: number | null
}

// One row of the web's comparison table: every period present for a member in any
// period's top ten, so a value is never missing just because another period cut
// them. A null rank means the member had no time in that period.
export type LeaderboardTableRow = {
  discordId: string
  name: string | null
  image: string | null
  day: LeaderboardCell
  week: LeaderboardCell
  month: LeaderboardCell
}

// A table row before names are resolved.
export type LeaderboardTableTotal = LeaderboardTableRow & { userId: Id<'users'> | null }

// The three periods the table compares. Reuses the Period vocabulary the
// leaderboard's saved preference already uses.
export const leaderboardPeriods: readonly LeaderboardPeriod[] = ['day', 'week', 'month']

// The two instants every board is computed against: the focus day the caller
// selected (its Europe/Zurich midnight, epoch ms) and the caller's clock. The
// service derives today's Day and the focus day's Week and Month from these, so
// queries never read the wall clock (see ../workSessions/util).
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

// The web's read of the comparison table for a signed-in member. No secret — the
// service gates it on the Clerk identity instead.
export const getLeaderboardTableForViewerArgs = v.object(boardArgs)

export type GetBoardsArgs = Infer<typeof getBoardsArgs>
export type GetLeaderboardTableForViewerArgs = Infer<typeof getLeaderboardTableForViewerArgs>
