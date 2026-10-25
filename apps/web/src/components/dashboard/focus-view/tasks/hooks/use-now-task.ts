import { api } from '@studytrack/backend/convex/_generated/api'
import type { Task } from '@studytrack/backend/convex/tasks/types'
import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/workSessions/util'
import { useMutation, useQuery } from 'convex/react'
import { logTaskError } from './log-task-error'

// The member's Now: today's top Open task, derived from the same Day the room
// reads. Independent of the Day the board is showing (ADR-0011). The only write
// it owns is a live completion, so it always passes today.
export type NowTask = {
  task: Task | null
  complete: () => void
}

export function useNowTask(now: number): NowTask {
  const todayStart = startOfDay(now, DASHBOARD_TIME_ZONE)
  // Minute precision matches the room's read and keeps the subscription stable
  // between ticks; Now never changes on a second boundary.
  const nowMinute = Math.floor(now / 60_000) * 60_000
  const task = useQuery(api.tasks.getNow, { dayStart: todayStart, now: nowMinute }) ?? null
  const toggle = useMutation(api.tasks.toggle)

  const complete = () => {
    if (!task) return
    void toggle({ taskId: task.id, focusDayStart: todayStart }).catch(logTaskError)
  }

  return { task, complete }
}
