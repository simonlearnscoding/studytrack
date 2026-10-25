import { api } from '@studytrack/backend/convex/_generated/api'
import type { LeaderboardPeriod } from '@studytrack/backend/convex/preferences/types'
import { useMutation, useQuery } from 'convex/react'
import { optimisticPreference } from './optimistic-preference'

/**
 * The member's remembered leaderboard Period, read live from Convex. A member who
 * never chose — or a signed-out visitor — leads with the Week. Convex dedupes the
 * subscription, so both Leaderboard surfaces can call this without extra reads.
 */
export function useLeaderboardPeriod(): LeaderboardPeriod {
  return useQuery(api.preferences.mine)?.leaderboardPeriod ?? 'week'
}

/**
 * The leaderboard's sort value plus a writer. The write is optimistic, so the
 * column flips before the round-trip. A signed-out click is rejected and the
 * optimistic value rolls back — nothing is remembered.
 */
export function useLeaderboardPeriodPreference(): [
  LeaderboardPeriod,
  (period: LeaderboardPeriod) => void,
] {
  const period = useLeaderboardPeriod()
  const save = useMutation(api.preferences.setLeaderboardPeriod).withOptimisticUpdate(
    (localStore, args) => optimisticPreference(localStore, 'leaderboardPeriod', args.period)
  )

  function choose(next: LeaderboardPeriod) {
    save({ period: next }).catch(() => {
      // Signed out: the write is rejected; the live value rolls back.
    })
  }

  return [period, choose]
}
