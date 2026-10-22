import { api } from '@studytrack/backend/convex/_generated/api'
import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/sessions/util'
import type { Task, TaskPlacement } from '@studytrack/backend/convex/tasks/types'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import { useDateStore } from '~/state/date.store'
import { useTaskCacheStore } from '~/state/task-cache.store'
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
 * `live` is the tracking indicator the around-the-room UI uses. The task you are
 * on needs no pointer: Now is always the first open task in the queue, so a
 * stored active task can never change what the screen shows.
 */
export function useTaskQueue(initialLive: boolean) {
  const selectedDate = useDateStore((state) => state.selectedDate)
  const dayStart = startOfDay(selectedDate.getTime(), DASHBOARD_TIME_ZONE)

  const tasks = useQuery(api.tasks.listMine, { dayStart })
  const create = useMutation(api.tasks.create)
  const toggle = useMutation(api.tasks.toggle)
  const renameTask = useMutation(api.tasks.rename)
  const removeTask = useMutation(api.tasks.remove)
  const reorderTasks = useMutation(api.tasks.reorder).withOptimisticUpdate((localStore, args) => {
    const { dayStart: day } = args
    const current = localStore.getQuery(api.tasks.listMine, { dayStart: day })
    if (current === undefined) return

    const byId = new Map(current.map((task) => [task.id, task]))
    const sent = new Set(args.orderedTaskIds)
    const ordered = args.orderedTaskIds.flatMap((id) => {
      const task = byId.get(id)
      return task ? [task] : []
    })
    const rest = current.filter((task) => !sent.has(task.id))
    localStore.setQuery(api.tasks.listMine, { dayStart: day }, [...ordered, ...rest])
  })

  const [live, setLive] = useState(initialLive)
  // Convex's `useQuery` only exposes results for active subscriptions, so a Day
  // we navigate away from has no local result when we come back. Show the last
  // seen list for that Day until the live subscription reconnects and refreshes
  // it, instead of flashing the loading skeleton.
  const remembered = useTaskCacheStore((state) => state.byDay[dayStart])
  const remember = useTaskCacheStore((state) => state.remember)
  const visibleTasks = tasks ?? remembered

  useEffect(() => {
    if (tasks !== undefined) remember(dayStart, tasks)
  }, [tasks, dayStart, remember])

  const items = visibleTasks?.map(toQueueTask) ?? []
  // Now is the topmost open task of the Day. Nothing is stored: completing or
  // reordering the queue moves the marker by itself.
  const now = items.find((task) => !task.done)

  const add = (title: string, placement: TaskPlacement = 'end') => {
    void create({ title, plannedAt: dayStart, placement }).catch(logTaskError)
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

  const reorder = (orderedTaskIds: TaskId[]) => {
    void reorderTasks({ dayStart, orderedTaskIds }).catch(logTaskError)
  }

  const startTracking = () => setLive(true)

  const toggleTracking = () => setLive((current) => !current)

  return {
    loading: visibleTasks === undefined,
    items,
    live,
    now,
    add,
    rename,
    remove,
    tick,
    reorder,
    startTracking,
    toggleTracking,
  }
}

export type TaskQueue = ReturnType<typeof useTaskQueue>

function toQueueTask(task: Task): QueueTask {
  return {
    ...task,
    doneAt: task.completedAt === null ? null : DONE_AT_FORMAT.format(new Date(task.completedAt)),
  }
}

function logTaskError(error: unknown) {
  console.error('[studytrack] task change failed', error)
}
