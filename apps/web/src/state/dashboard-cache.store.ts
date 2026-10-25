import type { DashboardMember } from '@studytrack/backend/convex/workSessions/types'
import { create } from 'zustand'

/**
 * The last dashboard payload seen for each Day. Convex's `useQuery` only exposes
 * results for active subscriptions, so a Day we navigate away from has no local
 * result when we come back. Remembering it here lets the timeline and room render
 * instantly while the live subscription reconnects and refreshes it.
 */
interface DashboardCacheState {
  byDay: Record<number, DashboardMember[]>
  remember: (dayStart: number, members: DashboardMember[]) => void
}

export const useDashboardCacheStore = create<DashboardCacheState>((set) => ({
  byDay: {},
  remember: (dayStart, members) =>
    set((state) =>
      state.byDay[dayStart] === members ? state : { byDay: { ...state.byDay, [dayStart]: members } }
    ),
}))
