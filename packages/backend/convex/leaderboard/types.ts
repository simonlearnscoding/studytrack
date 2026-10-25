import { v, type Infer } from 'convex/values'
import type { Id } from '../_generated/dataModel'
import type { LeaderboardPeriod } from '../preferences/types'
import type { LiveTail } from '../workSessions/types'

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

// One member's settled numbers in one period: everything up to the last close,
// with still-running time left for the reader to add from `live`. Kept separate
// from ranks because the reader ranks after adding that tail.
export type LeaderboardCell = {
  deepFocusMs: number
  totalMs: number
}

// One cell plus the rank its value leads with, over every member with time in the
// period. A null rank means the member had no time in that period.
export type LeaderboardRankedCell = LeaderboardCell & {
  deepFocusRank: number | null
  totalRank: number | null
}

// One row of the web's comparison table: every member with time in any period, so
// the reader can rank the whole group after adding each live tail.
export type LeaderboardTableRow = {
  discordId: string
  name: string | null
  image: string | null
  day: LeaderboardCell
  week: LeaderboardCell
  month: LeaderboardCell
  live: LiveTail
}

// The reader's view of a table row, after adding `live` and ranking the group.
export type LeaderboardRankedRow = Omit<LeaderboardTableRow, 'day' | 'week' | 'month' | 'live'> & {
  day: LeaderboardRankedCell
  week: LeaderboardRankedCell
  month: LeaderboardRankedCell
}

// A table row before names are resolved.
export type LeaderboardTableTotal = LeaderboardTableRow & { userId: Id<'users'> | null }

// The three periods the table compares. Reuses the Period vocabulary the
// leaderboard's saved preference already uses.
export const leaderboardPeriods: readonly LeaderboardPeriod[] = ['day', 'week', 'month']

// The bot's read: the focus day, the caller's clock and the shared bot secret.
// The bot polls, so a ticking `now` costs it nothing.
export const getBoardsArgs = v.object({
  secret: v.string(),
  now: v.number(),
  focusDayStart: v.number(),
})

// The web's read of the comparison table for a signed-in member. Both instants
// are stable for the whole Day (`todayStart` only moves at midnight), so the
// subscription is not replaced by the clock. Still-running time is returned as
// `live` anchors and added in the browser. No secret — the service gates it on
// the Clerk identity instead.
export const getLeaderboardTableForViewerArgs = v.object({
  focusDayStart: v.number(),
  todayStart: v.number(),
})

export type GetBoardsArgs = Infer<typeof getBoardsArgs>
export type GetLeaderboardTableForViewerArgs = Infer<typeof getLeaderboardTableForViewerArgs>
