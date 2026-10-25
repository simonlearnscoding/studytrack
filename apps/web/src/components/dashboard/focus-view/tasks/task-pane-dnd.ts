import type { Id } from '@studytrack/backend/convex/_generated/dataModel'
import { arrayMove } from '@dnd-kit/sortable'
import { MAIN_QUEUE_DROP_ID, SCHEDULE_FOR_TODAY_DROP_ID } from './dnd/task-pane-collision'
import type { DayTaskQueueState, QueueTask, TaskId } from './task-types'

type OverLike = {
  id: string | number
  data: {
    current?: {
      kind?: string
      source?: string
      planBlockId?: Id<'planBlock'>
    }
  }
}

export type DropTarget =
  | { kind: 'schedule' }
  | { kind: 'main'; container: boolean }
  | { kind: 'plan'; planBlockId: Id<'planBlock'>; container: boolean }

export type DropAction =
  | { kind: 'schedule' }
  | { kind: 'reorder'; orderedTaskIds: TaskId[] }
  | { kind: 'assign'; planBlockId: Id<'planBlock'>; orderedTaskIds: TaskId[] }
  | { kind: 'unassign'; planBlockId: Id<'planBlock'>; orderedTaskIds: TaskId[] }
  | null

// What the pointer (or keyboard ghost) is over, named by the section it belongs
// to. A row carries its section in `data`; a section container is its own target.
export function dropTargetOf(over: OverLike | null): DropTarget | null {
  if (!over) return null
  if (over.id === SCHEDULE_FOR_TODAY_DROP_ID) return { kind: 'schedule' }
  if (over.id === MAIN_QUEUE_DROP_ID) return { kind: 'main', container: true }

  const data = over.data.current
  if (data?.kind === 'planGroup' && data.planBlockId) {
    return { kind: 'plan', planBlockId: data.planBlockId, container: true }
  }
  if (data?.source === 'plan' && data.planBlockId) {
    return { kind: 'plan', planBlockId: data.planBlockId, container: false }
  }
  if (data?.source === 'main') return { kind: 'main', container: false }
  return null
}

// The write one drop should make. The queue keeps one open-task order; each
// section is a projection, so the new full order is built by moving the active
// task into the target section and leaving every other section's order intact.
// Same-section drops only reorder; crossing a section boundary also writes the
// plan assignment, in the same mutation.
export function dropActionFor(
  activeTask: QueueTask,
  over: OverLike | null,
  state: DayTaskQueueState
): DropAction {
  const target = dropTargetOf(over)
  if (!target) return null
  if (target.kind === 'schedule') return { kind: 'schedule' }
  if (over?.id === activeTask.id) return null

  const mainIds = state.unassignedTasks.map((task) => task.id)
  const planIds = new Map<Id<'planBlock'>, TaskId[]>()
  if (state.livePlanGroup) {
    planIds.set(
      state.livePlanGroup.planBlockId,
      state.livePlanGroup.openTasks.map((task) => task.id)
    )
  }
  for (const group of state.upcomingPlanGroups) {
    planIds.set(
      group.planBlockId,
      group.openTasks.map((task) => task.id)
    )
  }

  const sourcePlanBlockId = activeTask.plan?.planBlockId ?? null
  const targetPlanBlockId = target.kind === 'plan' ? target.planBlockId : null
  const sourceIds = sourcePlanBlockId === null ? mainIds : planIds.get(sourcePlanBlockId)
  const targetIds = targetPlanBlockId === null ? mainIds : planIds.get(targetPlanBlockId)
  if (!targetIds) return null

  const sourceIndex = sourceIds?.indexOf(activeTask.id) ?? -1
  const targetIndex = target.container ? targetIds.length : targetIds.indexOf(over!.id as TaskId)

  if (sourcePlanBlockId === targetPlanBlockId && sourceIndex >= 0 && targetIndex >= 0) {
    // Sorting inside one section: match the animation by moving the active row
    // to the over row's index, not by removing first (which would shift "down").
    const moved = arrayMove([...targetIds], sourceIndex, targetIndex)
    targetIds.splice(0, targetIds.length, ...moved)
  } else {
    if (sourceIndex >= 0) sourceIds!.splice(sourceIndex, 1)
    targetIds.splice(targetIndex < 0 ? targetIds.length : targetIndex, 0, activeTask.id)
  }

  const orderedTaskIds: TaskId[] = []
  if (state.livePlanGroup) {
    orderedTaskIds.push(...(planIds.get(state.livePlanGroup.planBlockId) ?? []))
  }
  orderedTaskIds.push(...mainIds)
  for (const group of state.upcomingPlanGroups) {
    orderedTaskIds.push(...(planIds.get(group.planBlockId) ?? []))
  }

  if (sourcePlanBlockId === targetPlanBlockId) {
    return { kind: 'reorder', orderedTaskIds }
  }
  if (targetPlanBlockId === null) {
    return sourcePlanBlockId
      ? { kind: 'unassign', planBlockId: sourcePlanBlockId, orderedTaskIds }
      : null
  }
  return { kind: 'assign', planBlockId: targetPlanBlockId, orderedTaskIds }
}
