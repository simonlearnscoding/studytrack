import { api } from '@studytrack/backend/convex/_generated/api'
import type {
  LeaderboardRankedCell,
  LeaderboardRankedRow,
} from '@studytrack/backend/convex/leaderboard/types'
import { rankLiveTableRows } from '@studytrack/backend/convex/leaderboard/util'
import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/workSessions/util'
import { useQuery } from 'convex/react'
import { useLastDefined } from '~/hooks/use-last-defined'
import { useDateStore } from '~/state/date.store'
import { colorFor, initials } from '~/lib/avatar'

// One member's cell in one period: both metric cuts plus the rank each would
// lead with. The site metric switch picks which pair to show.
export type LeaderboardCellVM = {
  focus: number
  total: number
  focusRank: number | null
  totalRank: number | null
}

// One row of the comparison table: a member's avatar identity plus their numbers
// in every period. Every row carries all three periods, so a value is present
// even when the member has no time in one of them.
export type LeaderboardRowVM = {
  key: string
  initials: string
  color: string
  image: string | null
  name: string
  you: boolean
  day: LeaderboardCellVM
  week: LeaderboardCellVM
  month: LeaderboardCellVM
}

// The live table read: the Day, Week and Month of the focus day, keyed on the
// selected date. The query only takes stable Day starts, so the clock never
// replaces the subscription; the `now` tick is added here, in the browser, from
// the live tails. The last good table survives a key change so the board never
// blanks for a round trip.
export function useLeaderboard(now: number): { rows: LeaderboardRowVM[] } {
  const selectedDate = useDateStore((state) => state.selectedDate)
  // Normalise the client Date to the shared Europe/Zurich day start rather than
  // trusting the browser's own midnight.
  const focusDayStart = startOfDay(selectedDate.getTime(), DASHBOARD_TIME_ZONE)
  const todayStart = startOfDay(now, DASHBOARD_TIME_ZONE)
  const table = useLastDefined(
    useQuery(api.leaderboard.getLeaderboardTableForViewer, { focusDayStart, todayStart })
  )
  const me = useQuery(api.users.me)
  // A row is keyed by the shared member key the backend writes: the Discord id, or
  // the user id for a manual-only member with no Discord identity.
  const meKey = me ? (me.discordId ?? String(me._id)) : null
  const ranked = table ? rankLiveTableRows(table, focusDayStart, now) : []

  return { rows: toRows(ranked, meKey) }
}

function toRows(rows: LeaderboardRankedRow[], meKey: string | null): LeaderboardRowVM[] {
  return rows.map((row) => {
    const name = row.name ?? row.discordId
    return {
      key: row.discordId,
      initials: initials(name),
      color: colorFor(row.discordId),
      image: row.image,
      name,
      you: row.discordId === meKey,
      day: toCell(row.day),
      week: toCell(row.week),
      month: toCell(row.month),
    }
  })
}

function toCell(cell: LeaderboardRankedCell): LeaderboardCellVM {
  return {
    focus: toMinutes(cell.deepFocusMs),
    total: toMinutes(cell.totalMs),
    focusRank: cell.deepFocusRank,
    totalRank: cell.totalRank,
  }
}

function toMinutes(ms: number): number {
  return Math.floor(ms / 60_000)
}
