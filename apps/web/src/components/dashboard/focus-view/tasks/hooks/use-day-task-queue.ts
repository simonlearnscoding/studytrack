import { api } from '@studytrack/backend/convex/_generated/api'
import { formatClock, toMinute } from '@studytrack/backend/convex/timeline/util'
import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/workSessions/util'
import type { DayTask, TaskPlacement, TaskPlan } from '@studytrack/backend/convex/tasks/types'
import { useMutation, useQuery } from 'convex/react'
import { useCachedTasks } from './use-cached-tasks'
import { logTaskError } from './log-task-error'
import type { DayTaskQueue, QueueTask, TaskId } from '../task-types'

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
 * Its top Open task is just the top of that Day's list — it is Now only when the
 * Day is today. Now itself is a separate today-only read (useNowTask), so
 * browsing history never changes it.
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

  const tasks = visibleTasks?.map((task) => toQueueTask(task, dayStart, clockNow)) ?? []
  const openTasks = tasks.filter((task) => !task.done)
  const doneTasks = tasks.filter((task) => task.done)
  const topOpen = openTasks[0]

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
    // The viewed Day, not "today": the backend decides whether this completion
    // happened live, and only a live one earns an instant (ADR-0010).
    void toggleTask({ taskId: id, focusDayStart: dayStart }).catch(logTaskError)
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
      topOpen,
      canScheduleForToday,
      isViewingToday: dayStart === todayStart,
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

// The row shows a plan only while its window is still open. The read is
// clock-free, so the newest assignment may already have ended; the ticking
// queue decides, which also makes the chip disappear when the block ends.
function toQueueTask(task: DayTask, dayStart: number, clockNow: number): QueueTask {
  const plan = task.plan && task.plan.plannedEnd > clockNow ? task.plan : null
  return {
    ...task,
    plan,
    planLabel: plan ? planChipLabel(plan, dayStart) : null,
    doneAt: task.completedAt === null ? null : DONE_AT_FORMAT.format(new Date(task.completedAt)),
  }
}

function planChipLabel(plan: TaskPlan, dayStart: number): string {
  const start = formatClock(toMinute(plan.plannedStart, dayStart))
  const end = formatClock(toMinute(plan.plannedEnd, dayStart))
  return `${plan.title ?? 'Plan'} · ${start}–${end}`
}
