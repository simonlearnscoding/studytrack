import type { DashboardMember } from '@studytrack/backend/convex/workSessions/types'
import { useEffect } from 'react'
import { useDashboardCacheStore } from '~/state/dashboard-cache.store'

/**
 * The Day's dashboard members, falling back to the last payload seen for that
 * Day while the live Convex subscription reconnects. Every fresh result refreshes
 * the cache.
 */
export function useCachedMembers(dayStart: number, members: DashboardMember[] | undefined) {
  const cachedMembers = useDashboardCacheStore((state) => state.byDay[dayStart])
  const remember = useDashboardCacheStore((state) => state.remember)

  useEffect(() => {
    if (members !== undefined) remember(dayStart, members)
  }, [members, dayStart, remember])

  return members ?? cachedMembers
}
