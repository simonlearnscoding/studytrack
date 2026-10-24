import { api } from '@studytrack/backend/convex/_generated/api'
import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/sessions/util'
import type { Task, TaskPlacement } from '@studytrack/backend/convex/tasks/types'
import { useMutation, useQuery } from 'convex/react'
import { useCachedTasks } from '~/hooks/use-cached-tasks'
import type { DayTaskQueue, QueueTask, TaskId } from './task-types'

const DONE_AT_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: DASHBOARD_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/**
 * The task queue for one Day, shared by the desktop pane and the mobile dock.
 * Reads and writes go straight to Convex, so both surfaces update live and the
 * list survives a reload.
 *
 * The Day is injected rather than read from the date store: `dayStart` is the
 * queue's scope, and `clockNow` only answers whether that Day is in the past.
 * The task you are on needs no pointer — Now is always the first open task in
 * the queue, so a stored active task can never change what the screen shows.
 */
export function useDayTaskQueue(dayStart: number, clockNow: number): DayTaskQueue {
  const todayStart = startOfDay(clockNow, DASHBOARD_TIME_ZONE)
  // Only a past Day can move a task to today; today and future Days cannot.
  const canScheduleForToday = dayStart < todayStart

  const remoteTasks = useQuery(api.tasks.listMine, { dayStart })
  const create = useMutation(api.tasks.create)
  const toggleTask = useMutation(api.tasks.toggle)
  const renameStoredTask = useMutation(api.tasks.rename)
  const removeStoredTask = useMutation(api.tasks.remove)
  const rescheduleStoredTask = useMutation(api.tasks.reschedule)
  const reorderStoredTasks = useMutation(api.tasks.reorder).withOptimisticUpdate(
    (localStore, args) => {
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
      localStore.setQuery(api.tasks.listMine, { dayStart: day }, [
        ...orderedTasks,
        ...unlistedTasks,
      ])
    }
  )

  // Convex's `useQuery` only exposes results for active subscriptions, so a Day
  // we navigate away from has no local result when we come back. Show the last
  // seen list for that Day until the live subscription reconnects and refreshes
  // it, instead of flashing the loading skeleton.
  const visibleTasks = useCachedTasks(dayStart, remoteTasks)

  // Now is the topmost open task of the Day. Nothing is stored: completing or
  // reordering the queue moves the marker by itself.
  const tasks = visibleTasks?.map(toQueueTask) ?? []
  const openTasks = tasks.filter((task) => !task.done)
  const doneTasks = tasks.filter((task) => task.done)
  const now = openTasks[0]

  const addTask = (title: string, placement: TaskPlacement = 'end') => {
    void create({ title, plannedAt: dayStart, placement }).catch(logTaskError)
  }

  const renameTask = (id: TaskId, title: string) => {
    void renameStoredTask({ taskId: id, title }).catch(logTaskError)
  }

  const removeTask = (id: TaskId) => {
    void removeStoredTask({ taskId: id }).catch(logTaskError)
  }

  const toggleTaskDone = (id: TaskId) => {
    void toggleTask({ taskId: id }).catch(logTaskError)
  }

  const reorderTasks = (orderedTaskIds: TaskId[]) => {
    void reorderStoredTasks({ dayStart, orderedTaskIds }).catch(logTaskError)
  }

  const scheduleTaskForToday = (id: TaskId) => {
    void rescheduleStoredTask({ taskId: id, plannedAt: todayStart }).catch(logTaskError)
  }

  return {
    state: {
      status: visibleTasks === undefined ? 'loading' : 'ready',
      openTasks,
      doneTasks,
      now,
      canScheduleForToday,
    },
    actions: {
      addTask,
      renameTask,
      removeTask,
      toggleTaskDone,
      reorderTasks,
      scheduleTaskForToday,
    },
  }
}

function toQueueTask(task: Task): QueueTask {
  return {
    ...task,
    doneAt: task.completedAt === null ? null : DONE_AT_FORMAT.format(new Date(task.completedAt)),
  }
}

function logTaskError(error: unknown) {
  console.error('[studytrack] task change failed', error)
}
