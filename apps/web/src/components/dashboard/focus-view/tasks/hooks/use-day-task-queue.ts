import { api } from '@studytrack/backend/convex/_generated/api'
import type { Id } from '@studytrack/backend/convex/_generated/dataModel'
import type { DayTask, TaskPlacement } from '@studytrack/backend/convex/tasks/types'
import { byCompletionOrder } from '@studytrack/backend/convex/tasks/util'
import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/workSessions/util'
import { useMutation, useQuery } from 'convex/react'
import { buildPlanSections, planBlocksFromTasks, planWindowLabel } from '../plan-groups'
import { useCachedTasks } from './use-cached-tasks'
import { logTaskError } from './log-task-error'
import { optimisticTaskOrder, optimisticTaskPlan } from './optimistic-tasks'
import type { DayTaskQueue, QueueTask, TaskId } from '../task-types'
import type { TaskPlan } from '@studytrack/backend/convex/tasks/types'

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
 * queue's scope, and `clockNow` tells a live plan from an upcoming one and
 * whether that Day is in the past. The desktop pane splits the one queue order
 * into sections; the mobile sheet keeps the flat list.
 */
export function useDayTaskQueue(dayStart: number, clockNow: number): DayTaskQueue {
  const todayStart = startOfDay(clockNow, DASHBOARD_TIME_ZONE)
  // Only a past Day can move a task to today; today and future Days cannot.
  const canScheduleForToday = dayStart < todayStart

  const remoteTasks = useQuery(api.tasks.listMine, { dayStart })
  const remotePlanBlocks = useQuery(api.planBlocks.listMine, { dayStart })
  const create = useMutation(api.tasks.create)
  const toggleTask = useMutation(api.tasks.toggle)
  const renameStoredTask = useMutation(api.tasks.rename)
  const removeStoredTask = useMutation(api.tasks.remove)
  const rescheduleStoredTask = useMutation(api.tasks.reschedule)
  const reorderStoredTasks = useMutation(api.tasks.reorder).withOptimisticUpdate(
    (localStore, args) => {
      optimisticTaskOrder(localStore, args.dayStart, args.orderedTaskIds)
    }
  )
  const assignNewStoredTask = useMutation(api.planBlocks.assignNew)
  const assignStoredTask = useMutation(api.planBlocks.assign).withOptimisticUpdate(
    (localStore, args) => {
      const block = remotePlanBlocks?.find((entry) => entry._id === args.planBlockId)
      if (block) {
        optimisticTaskPlan(localStore, dayStart, args.taskId, {
          planBlockId: block._id,
          title: block.title ?? null,
          plannedStart: block.plannedStart,
          plannedEnd: block.plannedEnd,
        })
      }
      if (args.orderedTaskIds) optimisticTaskOrder(localStore, dayStart, args.orderedTaskIds)
    }
  )
  const unassignStoredTask = useMutation(api.planBlocks.unassign).withOptimisticUpdate(
    (localStore, args) => {
      optimisticTaskPlan(localStore, dayStart, args.taskId, null)
      if (args.orderedTaskIds) optimisticTaskOrder(localStore, dayStart, args.orderedTaskIds)
    }
  )

  // Convex's `useQuery` only exposes results for active subscriptions, so a Day
  // we navigate away from has no local result when we come back. Show the last
  // seen list for that Day until the live subscription reconnects and refreshes
  // it, instead of flashing the loading skeleton.
  const visibleTasks = useCachedTasks(dayStart, remoteTasks)

  const tasks = visibleTasks?.map((task) => toQueueTask(task, dayStart, clockNow)) ?? []
  const openTasks = tasks.filter((task) => !task.done)
  const doneTasks = tasks.filter((task) => task.done).sort(byCompletionOrder)
  const sections = buildPlanSections(
    openTasks,
    doneTasks,
    remotePlanBlocks ?? planBlocksFromTasks(tasks),
    clockNow,
    dayStart
  )

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

  const assignTaskToPlan = (id: TaskId, planBlockId: Id<'planBlock'>, orderedTaskIds: TaskId[]) => {
    void assignStoredTask({ planBlockId, taskId: id, orderedTaskIds }).catch(logTaskError)
  }

  const unassignTaskFromPlan = (
    id: TaskId,
    planBlockId: Id<'planBlock'>,
    orderedTaskIds: TaskId[]
  ) => {
    void unassignStoredTask({ planBlockId, taskId: id, orderedTaskIds }).catch(logTaskError)
  }

  // Unlike every other queue action, this one returns its promise so the
  // composer can show the backend's refusal under the field. The live read lands
  // the new row; there is no optimistic write.
  const assignNewTask = async (planBlockId: Id<'planBlock'>, title: string) => {
    await assignNewStoredTask({ planBlockId, title })
  }

  const scheduleTaskForToday = (id: TaskId) => {
    void rescheduleStoredTask({ taskId: id, plannedAt: todayStart }).catch(logTaskError)
  }

  return {
    state: {
      status: visibleTasks === undefined ? 'loading' : 'ready',
      openTasks,
      doneTasks,
      unassignedTasks: sections.unassignedTasks,
      livePlanGroup: sections.livePlanGroup,
      upcomingPlanGroups: sections.upcomingPlanGroups,
      canScheduleForToday,
      isViewingToday: dayStart === todayStart,
    },
    actions: {
      addTask,
      renameTask,
      removeTask,
      toggleTaskDone,
      reorderTasks,
      assignTaskToPlan,
      unassignTaskFromPlan,
      assignNewTask,
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
  return `${plan.title ?? 'Plan'} · ${planWindowLabel(plan.plannedStart, plan.plannedEnd, dayStart)}`
}
