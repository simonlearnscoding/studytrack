import type { DayTask } from '@studytrack/backend/convex/tasks/types'
import { useEffect } from 'react'
import { useTaskCacheStore } from '~/state/task-cache.store'

/**
 * The Day's tasks, falling back to the last list seen for that Day while the
 * live Convex subscription reconnects. Every fresh result refreshes the cache.
 */
export function useCachedTasks(dayStart: number, tasks: DayTask[] | undefined) {
  const cachedTasks = useTaskCacheStore((state) => state.byDay[dayStart])
  const remember = useTaskCacheStore((state) => state.remember)

  useEffect(() => {
    if (tasks !== undefined) remember(dayStart, tasks)
  }, [tasks, dayStart, remember])

  return tasks ?? cachedTasks
}
