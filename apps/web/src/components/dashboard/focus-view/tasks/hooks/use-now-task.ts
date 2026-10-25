import { api } from '@studytrack/backend/convex/_generated/api'
import type { NowTaskCandidate } from '@studytrack/backend/convex/tasks/types'
import { pickNowCandidate } from '@studytrack/backend/convex/tasks/util'
import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/workSessions/util'
import { useMutation, useQuery } from 'convex/react'
import { logTaskError } from './log-task-error'

// The member's Now: the live plan's first Open task, else the unscheduled queue,
// then the earliest upcoming plan (ST-35). The read is clock-free; the pick runs
// here against the caller's ticking clock, so crossing a plan boundary never
// re-subscribes. Independent of the Day the board is showing (ADR-0011).
export type NowTask = {
  task: NowTaskCandidate | null
  complete: () => void
}

export function useNowTask(now: number): NowTask {
  const todayStart = startOfDay(now, DASHBOARD_TIME_ZONE)
  const candidates = useQuery(api.tasks.getNow, { dayStart: todayStart })
  const task = candidates ? pickNowCandidate(candidates, now) : null
  const toggle = useMutation(api.tasks.toggle)

  const complete = () => {
    if (!task) return
    void toggle({ taskId: task.id, focusDayStart: todayStart }).catch(logTaskError)
  }

  return { task, complete }
}
