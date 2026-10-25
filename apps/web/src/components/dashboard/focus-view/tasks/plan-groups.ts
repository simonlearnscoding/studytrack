import { formatClock, toMinute } from '@studytrack/backend/convex/timeline/util'
import type { Id } from '@studytrack/backend/convex/_generated/dataModel'
import type { PlanGroup, QueueTask } from './task-types'

// The subset of a stored planBlock the task pane needs. Keeping it structural
// lets the live query result pass through without pulling the table's Doc type
// into the view layer.
export type DayPlanBlock = {
  _id: Id<'planBlock'>
  title?: string
  plannedStart: number
  plannedEnd: number
}

// The Day's sections: the live plan, the unassigned queue, then upcoming plans.
// Groups are projections of the one queue order, so a task belongs to at most one
// section and the unassigned list is simply what no not-ended block claims.
export function buildPlanSections(
  openTasks: QueueTask[],
  doneTasks: QueueTask[],
  planBlocks: DayPlanBlock[],
  clockNow: number,
  dayStart: number
) {
  const groups = planBlocks
    .filter((block) => block.plannedEnd > clockNow)
    .sort((a, b) => a.plannedStart - b.plannedStart)
    .map((block) => toPlanGroup(block, openTasks, doneTasks, clockNow, dayStart))

  const livePlanGroup = groups.find((group) => group.isLive) ?? null
  const upcomingPlanGroups = groups.filter((group) => group !== livePlanGroup)
  const groupedTaskIds = new Set(groups.flatMap((group) => group.openTasks.map((task) => task.id)))
  const unassignedTasks = openTasks.filter((task) => !groupedTaskIds.has(task.id))

  return { livePlanGroup, upcomingPlanGroups, unassignedTasks }
}

// While the block list is still in flight, the tasks' own plan reads carry
// enough to draw their groups. This keeps assigned rows out of the unassigned
// list for the first frame; empty groups appear when the block query lands.
export function planBlocksFromTasks(tasks: QueueTask[]): DayPlanBlock[] {
  const byId = new Map<Id<'planBlock'>, DayPlanBlock>()
  for (const task of tasks) {
    if (!task.plan) continue
    byId.set(task.plan.planBlockId, {
      _id: task.plan.planBlockId,
      ...(task.plan.title === null ? {} : { title: task.plan.title }),
      plannedStart: task.plan.plannedStart,
      plannedEnd: task.plan.plannedEnd,
    })
  }
  return [...byId.values()]
}

// The window is the one piece of a plan a member should read at a glance, so an
// unnamed block uses it as its label and a named one keeps it beside the title.
export function planWindowLabel(plannedStart: number, plannedEnd: number, dayStart: number) {
  const start = formatClock(toMinute(plannedStart, dayStart))
  const end = formatClock(toMinute(plannedEnd, dayStart))
  return `${start}–${end}`
}

function toPlanGroup(
  block: DayPlanBlock,
  openTasks: QueueTask[],
  doneTasks: QueueTask[],
  clockNow: number,
  dayStart: number
): PlanGroup {
  const title = block.title?.trim() ? block.title.trim() : null
  const windowLabel = planWindowLabel(block.plannedStart, block.plannedEnd, dayStart)
  const groupedOpenTasks = openTasks.filter((task) => task.plan?.planBlockId === block._id)
  const doneCount = doneTasks.filter((task) => task.plan?.planBlockId === block._id).length

  return {
    planBlockId: block._id,
    title,
    plannedStart: block.plannedStart,
    plannedEnd: block.plannedEnd,
    isLive: block.plannedStart <= clockNow,
    label: title ?? windowLabel,
    windowLabel,
    openTasks: groupedOpenTasks,
    doneCount,
    totalCount: groupedOpenTasks.length + doneCount,
  }
}
