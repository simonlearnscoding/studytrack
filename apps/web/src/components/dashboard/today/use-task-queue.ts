import { api } from '@studytrack/backend/convex/_generated/api'
import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/sessions/util'
import type { Task, TaskPlacement } from '@studytrack/backend/convex/tasks/types'
import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { useCachedTasks } from '~/hooks/use-cached-tasks'
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
 * `isTracking` is the tracking indicator the around-the-room UI uses. The task
 * you are on needs no pointer: Now is always the first open task in the queue,
 * so a stored active task can never change what the screen shows.
 */
export function useTaskQueue(initiallyTracking: boolean, clockNow: number) {
  const selectedDate = useDateStore((state) => state.selectedDate)
  const dayStart = startOfDay(selectedDate.getTime(), DASHBOARD_TIME_ZONE)
  const todayStart = startOfDay(clockNow, DASHBOARD_TIME_ZONE)
  // Only a past Day offers "move to today"; today and future Days do not.
  const isPastDay = dayStart < todayStart

  const remoteTasks = useQuery(api.tasks.listMine, { dayStart })
  const create = useMutation(api.tasks.create)
  const toggle = useMutation(api.tasks.toggle)
  const renameTask = useMutation(api.tasks.rename)
  const removeTask = useMutation(api.tasks.remove)
  const rescheduleTask = useMutation(api.tasks.reschedule)
  const reorderTasks = useMutation(api.tasks.reorder).withOptimisticUpdate((localStore, args) => {
    const { dayStart: day, orderedTaskIds } = args
    // `localStore` is Convex's client-side optimistic store: its queries and
    // mutations are applied to the cache immediately, then reconciled with the
    // server result. `getQuery` reads what that Day currently renders.
    const currentTasks = localStore.getQuery(api.tasks.listMine, { dayStart: day })
    if (currentTasks === undefined) return

    const tasksById = new Map(currentTasks.map((task) => [task.id, task]))
    const orderedIds = new Set(orderedTaskIds)
    const orderedTasks = orderedTaskIds.flatMap((id) => {
      const task = tasksById.get(id)
      return task ? [task] : []
    })
    // Tasks the caller's order did not mention keep their relative order at the
    // end, so a partial reorder never drops a task from the list.
    const unlistedTasks = currentTasks.filter((task) => !orderedIds.has(task.id))
    localStore.setQuery(api.tasks.listMine, { dayStart: day }, [...orderedTasks, ...unlistedTasks])
  })

  const [isTracking, setIsTracking] = useState(initiallyTracking)
  // Convex's `useQuery` only exposes results for active subscriptions, so a Day
  // we navigate away from has no local result when we come back. Show the last
  // seen list for that Day until the live subscription reconnects and refreshes
  // it, instead of flashing the loading skeleton.
  const visibleTasks = useCachedTasks(dayStart, remoteTasks)

  // Now is the topmost open task of the Day. Nothing is stored: completing or
  // reordering the queue moves the marker by itself.
  const tasks = visibleTasks?.map(toQueueTask) ?? []
  const now = tasks.find((task) => !task.done)

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

  const scheduleForToday = (id: TaskId) => {
    void rescheduleTask({ taskId: id, plannedAt: todayStart }).catch(logTaskError)
  }

  const startTracking = () => setIsTracking(true)

  const toggleTracking = () => setIsTracking((tracking) => !tracking)

  return {
    loading: visibleTasks === undefined,
    tasks,
    isTracking,
    isPastDay,
    now,
    add,
    rename,
    remove,
    tick,
    reorder,
    scheduleForToday,
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
