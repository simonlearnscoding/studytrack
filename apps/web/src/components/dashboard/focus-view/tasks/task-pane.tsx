import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { TaskPlacement } from '@studytrack/backend/convex/tasks/types'
import { Plus } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { TaskComposerHint } from '~/components/dashboard/focus-view/tasks/task-composer-hint'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useDoneFold } from '~/preferences/use-done-fold'
import { MainQueueSection } from './main-queue-section'
import { PlanBlockButton } from './plan-block-button'
import { PlanGroupSection } from './plan-group-section'
import { handleComposerKeyDown, useTaskComposerHotkey } from './hooks/use-task-composer-hotkey'
import { DoneTaskItem } from './item/task-item'
import { taskPaneCollisionDetection } from './dnd/task-pane-collision'
import { dropActionFor, dropTargetOf } from './task-pane-dnd'
import { TaskGroup } from './task-group'
import { TaskOverlay } from './task-overlay'
import { ScheduleForTodayRail } from './dnd/schedule-for-today-rail'
import type { DayTaskQueue, TaskId } from './task-types'

const screenReaderInstructions = {
  draggable:
    'Press space or enter to lift the task. Use the arrow keys to move it. Drop on a plan group to plan it, or on the main queue to unplan it. Press space or enter to drop, or escape to cancel.',
}

export function TaskPane({
  queue,
  dayStart,
  now,
  dayLabel,
  nowTaskId,
  isEmbedded = false,
}: {
  queue: DayTaskQueue
  dayStart: number
  now: number
  dayLabel: string
  nowTaskId: TaskId | null
  isEmbedded?: boolean
}) {
  const { state, actions } = queue
  const [title, setTitle] = useState('')
  const [draggingId, setDraggingId] = useState<TaskId | null>(null)
  const [foldedPlanGroups, setFoldedPlanGroups] = useState<Set<string>>(new Set())
  const [highlightedPlanBlockId, setHighlightedPlanBlockId] = useState<string | null>(null)
  const [isDoneFolded, setDoneFolded] = useDoneFold()
  const inputRef = useRef<HTMLInputElement>(null)
  useTaskComposerHotkey(inputRef)

  const openTaskCount = state.openTasks.length
  const livePlanGroup = state.livePlanGroup
  const planGroups = [...(livePlanGroup ? [livePlanGroup] : []), ...state.upcomingPlanGroups]

  useEffect(() => {
    if (highlightedPlanBlockId === null) return
    const timer = setTimeout(() => setHighlightedPlanBlockId(null), 2000)
    return () => clearTimeout(timer)
  }, [highlightedPlanBlockId])
  const draggingTask = state.openTasks.find((task) => task.id === draggingId)
  const isDraggingPlanTask = draggingTask?.plan != null

  const isDoneExpanded = !isDoneFolded
  const isDoneResolved = isDoneFolded !== undefined

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const titleOf = (id: string | number) =>
    state.openTasks.find((task) => task.id === id)?.title ?? 'task'
  const groupOf = (planBlockId: string) =>
    planGroups.find((group) => group.planBlockId === planBlockId)
  const mainPositionOf = (id: string | number) =>
    state.unassignedTasks.findIndex((task) => task.id === id) + 1

  const announcements: Announcements = {
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

  const startDrag = ({ active }: DragStartEvent) => {
    setDraggingId(active.id as TaskId)
  }

  const endDrag = ({ active, over }: DragEndEvent) => {
    setDraggingId(null)
    const activeTask = state.openTasks.find((task) => task.id === active.id)
    if (!activeTask) return

    const action = dropActionFor(activeTask, over, state)
    if (!action) return

    if (action.kind === 'schedule') {
      actions.scheduleTaskForToday(activeTask.id)
    } else if (action.kind === 'reorder') {
      actions.reorderTasks(action.orderedTaskIds)
    } else if (action.kind === 'assign') {
      actions.assignTaskToPlan(activeTask.id, action.planBlockId, action.orderedTaskIds)
    } else {
      actions.unassignTaskFromPlan(activeTask.id, action.planBlockId, action.orderedTaskIds)
    }
  }

  const togglePlanGroup = (planBlockId: string) => {
    setFoldedPlanGroups((current) => {
      const next = new Set(current)
      if (next.has(planBlockId)) next.delete(planBlockId)
      else next.add(planBlockId)
      return next
    })
  }

  const add = (placement: TaskPlacement) => {
    const trimmed = title.trim()
    if (!trimmed) return
    setTitle('')
    actions.addTask(trimmed, placement)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    add('end')
  }

  const hasGroups = livePlanGroup !== null || state.upcomingPlanGroups.length > 0
  const isEmpty = state.openTasks.length === 0 && state.doneTasks.length === 0 && !hasGroups

  return (
    <section
      className={`flex min-h-0 flex-1 flex-col p-4 max-lg:p-3.5 ${isEmbedded ? '' : 'bg-card rounded-xl border'}`}
    >
      <div className="min-w-0 px-1 pb-3">
        <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
          {dayLabel}
        </h2>
        {state.status === 'ready' ? (
          <p className="text-caption mt-0.5">
            {openTaskCount} {openTaskCount === 1 ? 'task' : 'tasks'} planned
          </p>
        ) : null}
      </div>

      {/* composer */}
      <form
        onSubmit={submit}
        className="mb-4 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/[0.045] p-1.5 transition-colors duration-150 hover:border-primary/40 focus-within:border-primary/70 focus-within:bg-primary/[0.07]"
      >
        <Button
          type="submit"
          size="icon"
          aria-label="Create task"
          className="size-9 shrink-0 rounded-lg"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </Button>
        <div className="relative min-w-0 flex-1">
          <Input
            ref={inputRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => handleComposerKeyDown(event, add, () => setTitle(''))}
            placeholder="Add a task..."
            aria-label="New task"
            className="peer h-9 border-0 bg-transparent pr-20 pl-2 text-sm placeholder:text-hint focus-visible:ring-0 dark:bg-transparent"
          />
          <TaskComposerHint />
        </div>
      </form>

      {state.isViewingToday ? (
        <PlanBlockButton
          dayStart={dayStart}
          now={now}
          isLoading={state.status === 'loading'}
          planBlocks={planGroups}
          dayTasks={state.status === 'ready' ? state.openTasks : undefined}
          onCreated={setHighlightedPlanBlockId}
        />
      ) : null}

      {/* contract: checkbox = complete · pencil = rename · trash = delete */}
      <DndContext
        sensors={sensors}
        collisionDetection={taskPaneCollisionDetection}
        onDragStart={startDrag}
        onDragEnd={endDrag}
        onDragCancel={() => setDraggingId(null)}
        accessibility={{ announcements, screenReaderInstructions }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto max-lg:overflow-visible">
          {state.status === 'loading' ? (
            <div className="skeleton h-16 rounded-lg" />
          ) : isEmpty ? (
            <p className="text-caption px-3 py-6 text-center">
              No tasks planned for this day — add one above.
            </p>
          ) : (
            <div className="space-y-3">
              {livePlanGroup ? (
                <PlanGroupSection
                  group={livePlanGroup}
                  isExpanded={!foldedPlanGroups.has(livePlanGroup.planBlockId)}
                  onToggle={() => togglePlanGroup(livePlanGroup.planBlockId)}
                  isFresh={highlightedPlanBlockId === livePlanGroup.planBlockId}
                  nowTaskId={nowTaskId}
                  isViewingToday={state.isViewingToday}
                  actions={actions}
                />
              ) : null}

              <MainQueueSection
                tasks={state.unassignedTasks}
                nowTaskId={nowTaskId}
                isViewingToday={state.isViewingToday}
                isDraggingPlanTask={isDraggingPlanTask}
                actions={actions}
              />

              {state.upcomingPlanGroups.map((group) => (
                <PlanGroupSection
                  key={group.planBlockId}
                  group={group}
                  isExpanded={!foldedPlanGroups.has(group.planBlockId)}
                  onToggle={() => togglePlanGroup(group.planBlockId)}
                  isFresh={highlightedPlanBlockId === group.planBlockId}
                  nowTaskId={nowTaskId}
                  isViewingToday={state.isViewingToday}
                  actions={actions}
                />
              ))}

              {state.doneTasks.length > 0 ? (
                <TaskGroup
                  label="Done"
                  count={state.doneTasks.length}
                  isExpanded={isDoneExpanded}
                  onToggle={() => setDoneFolded(isDoneExpanded)}
                >
                  {isDoneResolved ? (
                    state.doneTasks.map((task) => (
                      <DoneTaskItem
                        key={task.id}
                        task={task}
                        onTick={() => actions.toggleTaskDone(task.id)}
                        onRename={(nextTitle) => actions.renameTask(task.id, nextTitle)}
                        onRemove={() => actions.removeTask(task.id)}
                      />
                    ))
                  ) : (
                    <li className="px-2 py-2">
                      <div className="skeleton h-9 rounded-lg" />
                    </li>
                  )}
                </TaskGroup>
              ) : null}
            </div>
          )}
        </div>

        {draggingId !== null && state.canScheduleForToday ? <ScheduleForTodayRail /> : null}

        <DragOverlay>
          {draggingTask ? (
            <TaskOverlay
              task={draggingTask}
              isNow={state.isViewingToday && draggingTask.id === nowTaskId}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  )
}
