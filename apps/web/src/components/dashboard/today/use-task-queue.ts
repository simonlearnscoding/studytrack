import { api } from '@studytrack/backend/convex/_generated/api'
import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/sessions/util'
import type { Task } from '@studytrack/backend/convex/tasks/types'
import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { useDateStore } from '~/state/date.store'
import type { QueueTask, TaskId } from './task-types'

const DONE_AT_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: DASHBOARD_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/**
 * The one source of truth for the focused Day's task queue, shared by the desktop
 * pane and the mobile dock. Reads and writes go straight to Convex, so both
 * surfaces update live and the list survives a reload.
 *
 * `live` is the tracking indicator the around-the-room UI uses; the active task
 * itself is user-level and is not cleared when tracking stops (ST-27).
 */
export function useTaskQueue(initialLive: boolean) {
  const selectedDate = useDateStore((state) => state.selectedDate)
  const dayStart = startOfDay(selectedDate.getTime(), DASHBOARD_TIME_ZONE)

  const tasks = useQuery(api.tasks.listMine, { dayStart })
  const activeTask = useQuery(api.tasks.getActive)
  const create = useMutation(api.tasks.create)
  const toggle = useMutation(api.tasks.toggle)
  const renameTask = useMutation(api.tasks.rename)
  const removeTask = useMutation(api.tasks.remove)
  const setActiveTask = useMutation(api.tasks.setActive)
  const clearActiveTask = useMutation(api.tasks.clearActive)

  const [live, setLive] = useState(initialLive)

  const items = tasks?.map((task) => toQueueTask(task, activeTask?.task.id === task.id)) ?? []
  const active = activeTask ? toQueueTask(activeTask.task, true) : undefined
  const next = upNext(items)

  const add = (title: string) => {
    void create({ title, plannedAt: dayStart }).catch(logTaskError)
  }

  const rename = (id: TaskId, title: string) => {
    void renameTask({ taskId: id, title }).catch(logTaskError)
  }

  const remove = (id: TaskId) => {
    void removeTask({ taskId: id }).catch(logTaskError)
  }

  const tick = (id: TaskId) => {
    void toggle({ taskId: id }).catch(logTaskError)
  }

  const setActive = (id: TaskId) => {
    const task = items.find((item) => item.id === id)
    if (!task || task.done) return
    if (task.active) {
      clearActive()
      return
    }
    void setActiveTask({ taskId: id }).catch(logTaskError)
  }

  const clearActive = () => {
    void clearActiveTask({}).catch(logTaskError)
  }

  const startTracking = () => setLive(true)

  const toggleTracking = () => setLive((current) => !current)

  return {
    loading: tasks === undefined || activeTask === undefined,
    items,
    live,
    active,
    next,
    activeSince: activeTask?.activeSince ?? null,
    add,
    rename,
    remove,
    tick,
    setActive,
    clearActive,
    startTracking,
    toggleTracking,
  }
}

export type TaskQueue = ReturnType<typeof useTaskQueue>

function toQueueTask(task: Task, active: boolean): QueueTask {
  return {
    ...task,
    active,
    doneAt: task.completedAt === null ? null : DONE_AT_FORMAT.format(new Date(task.completedAt)),
  }
}

// The first Open task below the active row, or the newest Open task when nothing
// is active. Never wraps back to the top.
function upNext(tasks: QueueTask[]): QueueTask | undefined {
  const activeIndex = tasks.findIndex((task) => task.active && !task.done)
  return tasks.slice(activeIndex + 1).find((task) => !task.done)
}

function logTaskError(error: unknown) {
  console.error('[studytrack] task change failed', error)
}
