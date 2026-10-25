import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '~/lib/utils'
import { MAIN_QUEUE_DROP_ID } from './dnd/task-pane-collision'
import { TaskItem } from './item/task-item'
import type { DayTaskQueueActions, QueueTask, TaskId } from './task-types'

// The unassigned queue keeps its plain list (no heading). While a plan task is
// dragged, the whole section is also the unassign target, so an empty queue
// still has somewhere to drop it.
export function MainQueueSection({
  tasks,
  nowTaskId,
  isViewingToday,
  isDraggingPlanTask,
  actions,
}: {
  tasks: QueueTask[]
  nowTaskId: TaskId | null
  isViewingToday: boolean
  isDraggingPlanTask: boolean
  actions: DayTaskQueueActions
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: MAIN_QUEUE_DROP_ID,
    data: { kind: 'mainQueue' },
    disabled: !isDraggingPlanTask,
  })
  const ids = tasks.map((task) => task.id)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl transition-colors duration-150',
        isOver && 'bg-primary/[0.045] ring-1 ring-primary/20'
      )}
    >
      {tasks.length > 0 ? (
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="space-y-0.5">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                isNow={isViewingToday && task.id === nowTaskId}
                data={{ source: 'main' }}
                onTick={() => actions.toggleTaskDone(task.id)}
                onRename={(title) => actions.renameTask(task.id, title)}
                onRemove={() => actions.removeTask(task.id)}
              />
            ))}
          </ul>
        </SortableContext>
      ) : isDraggingPlanTask ? (
        <p className="text-caption px-2 py-3">Drop here to remove it from the plan.</p>
      ) : null}
    </div>
  )
}
