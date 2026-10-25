import type { DayTask } from '@studytrack/backend/convex/tasks/types'
import { create } from 'zustand'

/**
 * The last task list seen for each Day. Convex's `useQuery` only exposes results
 * for active subscriptions, so a Day we navigate away from has no local result
 * when we come back. Remembering it here lets the list render instantly while the
 * live subscription reconnects and refreshes it.
 */
interface TaskCacheState {
  byDay: Record<number, DayTask[]>
  remember: (dayStart: number, tasks: DayTask[]) => void
}

export const useTaskCacheStore = create<TaskCacheState>((set) => ({
  byDay: {},
  remember: (dayStart, tasks) =>
    set((state) =>
      state.byDay[dayStart] === tasks ? state : { byDay: { ...state.byDay, [dayStart]: tasks } }
    ),
}))
