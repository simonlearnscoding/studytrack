import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ChevronUp } from 'lucide-react'
import { cn } from '~/lib/utils'
import { planGroupDropId } from './dnd/task-pane-collision'
import { TaskItem } from './item/task-item'
import { PlanBlockComposer } from './plan-block-composer'
import { planLengthLabel } from './plan-groups'
import type { DayTaskQueueActions, PlanGroup, TaskId } from './task-types'

// One not-ended plan as a card: an emerald rail, the plan's name and window, its
// rows, then the add row. The heading folds the card; the whole card is the drop
// target, so a task can land on an empty plan or on any of its rows.
export function PlanGroupSection({
  group,
  isExpanded,
  onToggle,
  isFresh,
  nowTaskId,
  isViewingToday,
  todayStart,
  rescheduleTask,
  actions,
  isDraggingPlanTask,
}: {
  group: PlanGroup
  isExpanded: boolean
  onToggle: () => void
  isFresh?: boolean
  nowTaskId: TaskId | null
  isViewingToday: boolean
  todayStart: number
  rescheduleTask: (id: TaskId, plannedAt: number) => void
  actions: DayTaskQueueActions
  isDraggingPlanTask: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: planGroupDropId(group.planBlockId),
    data: { kind: 'planGroup', planBlockId: group.planBlockId },
  })
  const ids = group.openTasks.map((task) => task.id)
  const lengthLabel = planLengthLabel(group.plannedStart, group.plannedEnd)
  const countLabel = `${group.totalCount} ${group.totalCount === 1 ? 'task' : 'tasks'}`

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'card-surface relative overflow-hidden transition-colors duration-150',
        'before:absolute before:inset-y-0 before:left-0 before:w-1',
        group.isLive ? 'before:bg-primary' : 'before:bg-primary/70',
        isOver || isFresh ? 'bg-primary-tint ring-1 ring-primary/30' : 'bg-secondary'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full cursor-pointer items-start gap-3 px-3.5 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-inset"
      >
        <span
          aria-hidden
          className={cn(
            'mt-0.5 size-4 shrink-0 rounded-full border-2',
            group.isLive ? 'border-primary' : 'border-border-strong'
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="text-body block truncate font-semibold text-foreground">
            {group.label}
          </span>
          <span className="text-caption mt-0.5 flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 font-mono">{group.windowLabel}</span>
            <span aria-hidden>·</span>
            <span className="shrink-0 font-mono">{lengthLabel}</span>
            <span aria-hidden>·</span>
            <span className="truncate">{countLabel}</span>
          </span>
        </span>
        <ChevronUp
          aria-hidden
          className={cn(
            'text-subtle-foreground mt-0.5 size-4 shrink-0 transition-transform duration-150 motion-reduce:transition-none',
            !isExpanded && 'rotate-180'
          )}
        />
      </button>

      {isExpanded ? (
        <ul className="space-y-0.5 px-1.5">
          {group.openTasks.length === 0 ? (
            // The hint keeps its row whether or not a drag is running, so starting
            // a drag never moves the sections below the pointer.
            <li className={cn('text-caption px-2 py-3', !isDraggingPlanTask && 'invisible')}>
              Drop a task here to plan it.
            </li>
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
                  reschedule={{
                    todayStart,
                    onReschedule: (plannedAt) => rescheduleTask(task.id, plannedAt),
                  }}
                />
              ))}
            </SortableContext>
          )}
        </ul>
      ) : null}

      {isExpanded ? (
        <div className="p-2 pt-1">
          <PlanBlockComposer onAdd={(title) => actions.assignNewTask(group.planBlockId, title)} />
        </div>
      ) : null}
    </div>
  )
}
