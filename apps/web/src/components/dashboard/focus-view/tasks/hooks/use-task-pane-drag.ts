import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState } from 'react'
import { dropActionFor, type DropAction } from '../task-pane-dnd'
import type { DayTaskQueueActions, DayTaskQueueState, TaskId } from '../task-types'

// The pane's one drag story: which task is lifted, which section it came from,
// and the single command its drop runs. The pane only reads the result, so the
// lift and the persisted order cannot drift apart.
export function useTaskPaneDrag({
  state,
  actions,
}: {
  state: DayTaskQueueState
  actions: DayTaskQueueActions
}) {
  const [draggingId, setDraggingId] = useState<TaskId | null>(null)
  const draggingTask = state.openTasks.find((task) => task.id === draggingId) ?? null
  const isDraggingPlanTask = draggingTask?.plan != null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const startDrag = ({ active }: DragStartEvent) => setDraggingId(active.id as TaskId)

  const endDrag = ({ active, over }: DragEndEvent) => {
    setDraggingId(null)
    const activeTask = state.openTasks.find((task) => task.id === active.id)
    if (!activeTask) return

    const dropAction = dropActionFor(activeTask, over, state)
    if (!dropAction) return

    performDropAction(actions, activeTask.id, dropAction)
  }

  const cancelDrag = () => setDraggingId(null)

  return { draggingId, draggingTask, isDraggingPlanTask, sensors, startDrag, endDrag, cancelDrag }
}

// One drop, one command. The queue's actions each own their own write, so the
// pane hands over the target and the order and never assembles a mutation.
function performDropAction(
  actions: DayTaskQueueActions,
  taskId: TaskId,
  dropAction: Exclude<DropAction, null>
) {
  switch (dropAction.kind) {
    case 'schedule':
      return actions.scheduleTaskForToday(taskId)
    case 'reorder':
      return actions.reorderTasks(dropAction.orderedTaskIds)
    case 'assign':
      return actions.assignTaskToPlan(taskId, dropAction.planBlockId, dropAction.orderedTaskIds)
    case 'unassign':
      return actions.unassignTaskFromPlan(taskId, dropAction.planBlockId, dropAction.orderedTaskIds)
  }
}
