import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '~/lib/utils'
import { planGroupDropId } from './dnd/task-pane-collision'
import { TaskItem } from './item/task-item'
import { TaskGroup } from './task-group'
import type { DayTaskQueueActions, PlanGroup, TaskId } from './task-types'

// One not-ended plan as a foldable section. The whole section is a drop target
// for dropping on its heading or empty body; its rows are individually sortable
// and win over the section when the pointer is on one of them.
export function PlanGroupSection({
  group,
  isExpanded,
  onToggle,
  nowTaskId,
  isViewingToday,
  actions,
}: {
  group: PlanGroup
  isExpanded: boolean
  onToggle: () => void
  nowTaskId: TaskId | null
  isViewingToday: boolean
  actions: DayTaskQueueActions
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: planGroupDropId(group.planBlockId),
    data: { kind: 'planGroup', planBlockId: group.planBlockId },
  })
  const ids = group.openTasks.map((task) => task.id)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl transition-colors duration-150',
        isOver && 'bg-primary/[0.045] ring-1 ring-primary/20'
      )}
    >
      <TaskGroup
        label={group.label}
        detail={group.title ? group.windowLabel : undefined}
        count={group.openTasks.length}
        progress={{ done: group.doneCount, total: group.totalCount }}
        isExpanded={isExpanded}
        onToggle={onToggle}
      >
        {group.openTasks.length === 0 ? (
          <li className="text-caption px-2 py-3">Drop a task here to plan it.</li>
        ) : (
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {group.openTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                isNow={isViewingToday && task.id === nowTaskId}
                showPlanChip={false}
                data={{ source: 'plan', planBlockId: group.planBlockId }}
                onTick={() => actions.toggleTaskDone(task.id)}
                onRename={(title) => actions.renameTask(task.id, title)}
                onRemove={() => actions.removeTask(task.id)}
              />
            ))}
          </SortableContext>
        )}
      </TaskGroup>
    </div>
  )
}
