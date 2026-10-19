import { api } from '@studytrack/backend/convex/_generated/api'
import type { LeaderboardRow } from '@studytrack/backend/convex/leaderboard/types'
import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/sessions/util'
import { useQuery } from 'convex/react'
import { useDateStore } from '~/state/date.store'
import { colorFor, initials } from './avatar-identity'

// One row of the consistency board: a member's avatar identity plus their study
// time in the two viewed periods, in whole minutes. The site metric switch picks
// `focus` or `total` for the numbers and the rank.
export type BoardRow = {
  key: string
  initials: string
  color: string
  name: string
  focus: number
  total: number
  you: boolean
}

// The live board read: the Week and Month of the focus day, keyed on the selected
// date. The caller supplies a once-a-minute `now` so the current period's live
// minutes update without refetching every second; every other argument is stable,
// so Convex can reuse the read across identical focus days.
export function useConsistencyBoard(now: number): {
  weekRows: BoardRow[]
  monthRows: BoardRow[]
} {
  const selectedDate = useDateStore((state) => state.selectedDate)
  // Normalise the client Date to the shared Europe/Zurich day start rather than
  // trusting the browser's own midnight.
  const focusDayStart = startOfDay(selectedDate.getTime(), DASHBOARD_TIME_ZONE)
  const boards = useQuery(api.leaderboard.getBoardsForViewer, { focusDayStart, now })
  const me = useQuery(api.users.me)
  // A row is keyed by the shared member key the backend writes: the Discord id, or
  // the user id for a manual-only member with no Discord identity.
  const meKey = me ? (me.discordId ?? String(me._id)) : null

  return {
    weekRows: toRows(boards?.week ?? [], meKey),
    monthRows: toRows(boards?.month ?? [], meKey),
  }
}

function toRows(rows: LeaderboardRow[], meKey: string | null): BoardRow[] {
  return rows.map((row) => {
    const name = row.name ?? row.discordId
    return {
      key: row.discordId,
      initials: initials(name),
      color: colorFor(row.discordId),
      name,
      focus: toMinutes(row.deepFocusMs),
      total: toMinutes(row.totalMs),
      you: row.discordId === meKey,
    }
  })
}

function toMinutes(ms: number): number {
  return Math.floor(ms / 60_000)
}
