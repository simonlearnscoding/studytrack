import type { Announcements, ScreenReaderInstructions } from '@dnd-kit/core'
import { dropTargetOf } from '../task-pane-dnd'
import type { DayTaskQueueState, PlanGroup } from '../task-types'

// What a screen reader hears while a task is lifted: the picked-up title, the
// section under the pointer (with the position when the pointer is on a row),
// then the drop or the cancel. Built from state alone, so the strings never
// depend on which component holds the drag flag.
export function buildTaskPaneAnnouncements({
  state,
  planGroups,
}: {
  state: DayTaskQueueState
  planGroups: PlanGroup[]
}): Announcements {
  const titleOf = (id: string | number) =>
    state.openTasks.find((task) => task.id === id)?.title ?? 'task'
  const groupOf = (planBlockId: string) =>
    planGroups.find((group) => group.planBlockId === planBlockId)
  const mainPositionOf = (id: string | number) =>
    state.unassignedTasks.findIndex((task) => task.id === id) + 1

  return {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) => {
      const target = dropTargetOf(over)
      if (!target) return undefined

      const taskTitle = titleOf(active.id)
      const activeTask = state.openTasks.find((task) => task.id === active.id)
      const isPlanSource = activeTask?.plan != null

      if (target.kind === 'schedule') return `Schedule ${taskTitle} for today.`
      if (target.kind === 'main') {
        if (isPlanSource || target.container) return `Move ${taskTitle} to the main queue.`
        return `${taskTitle} moved to position ${mainPositionOf(over!.id)} of ${state.unassignedTasks.length}.`
      }

      const group = groupOf(target.planBlockId)
      const groupLabel = group?.label ?? 'the plan'
      if (target.container) return `Move ${taskTitle} to ${groupLabel}.`
      const index = group?.openTasks.findIndex((task) => task.id === over!.id) ?? -1
      return `${taskTitle} moved to position ${index + 1} of ${group?.openTasks.length ?? 0} in ${groupLabel}.`
    },
    onDragEnd: ({ active }) => `Dropped ${titleOf(active.id)}.`,
    onDragCancel: ({ active }) =>
      `Reordering cancelled. ${titleOf(active.id)} returned to its place.`,
  }
}

// The keyboard contract for a lift names both drop targets, because a keyboard
// drag has no pointer to discover them with.
export const taskPaneDragInstructions: ScreenReaderInstructions = {
  draggable:
    'Press space or enter to lift the task. Use the arrow keys to move it. Drop on a plan group to plan it, or on the main queue to unplan it. Press space or enter to drop, or escape to cancel.',
}
