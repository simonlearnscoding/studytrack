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
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { TaskPlacement } from '@studytrack/backend/convex/tasks/types'
import { Plus } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { TaskComposerHint } from '~/components/dashboard/focus-view/tasks/task-composer-hint'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useDoneFold } from '~/preferences/use-done-fold'
import { handleComposerKeyDown, useTaskComposerHotkey } from './hooks/use-task-composer-hotkey'
import { DoneTaskItem, TaskItem } from './item/task-item'
import { taskPaneCollisionDetection } from './dnd/task-pane-collision'
import { TaskGroup } from './task-group'
import { TaskOverlay } from './task-overlay'
import { ScheduleForTodayRail } from './dnd/schedule-for-today-rail'
import { SCHEDULE_FOR_TODAY_DROP_ID } from './dnd/task-pane-collision'
import type { DayTaskQueue, TaskId } from './task-types'

const screenReaderInstructions = {
  draggable:
    'Press space or enter to lift the task. Use the arrow keys to move it. Press space or enter to drop, or escape to cancel.',
}

export function TaskPane({
  queue,
  dayLabel,
  isEmbedded = false,
}: {
  queue: DayTaskQueue
  dayLabel: string
  isEmbedded?: boolean
}) {
  const { state, actions } = queue
  const [title, setTitle] = useState('')
  const [draggingId, setDraggingId] = useState<TaskId | null>(null)
  const [isDoneFolded, setDoneFolded] = useDoneFold()
  const inputRef = useRef<HTMLInputElement>(null)
  useTaskComposerHotkey(inputRef)

  const openTaskCount = state.openTasks.length

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Only Open tasks are sortable; Done rows are records and render outside the
  // list. The reorder payload therefore carries only Open ids, and the server
  // appends the Done ids in their current order.
  const ids = state.openTasks.map((task) => task.id)
  const dragging = state.openTasks.find((task) => task.id === draggingId)
  const isDoneExpanded = !isDoneFolded
  const isDoneResolved = isDoneFolded !== undefined

  const titleOf = (id: string | number) =>
    state.openTasks.find((task) => task.id === id)?.title ?? 'task'
  const positionOf = (id: string | number) => ids.indexOf(id as TaskId) + 1
  // NOTE: this should probably be in a hook
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? over.id === SCHEDULE_FOR_TODAY_DROP_ID
          ? `Schedule ${titleOf(active.id)} for today.`
          : `${titleOf(active.id)} moved to position ${positionOf(over.id)} of ${ids.length}.`
        : undefined,
    onDragEnd: ({ active }) => `Dropped ${titleOf(active.id)}.`,
    onDragCancel: ({ active }) =>
      `Reordering cancelled. ${titleOf(active.id)} returned to its place.`,
  }

  const startDrag = ({ active }: DragStartEvent) => {
    setDraggingId(active.id as TaskId)
  }

  const endDrag = ({ active, over }: DragEndEvent) => {
    setDraggingId(null)
    if (!over) return
    if (over.id === SCHEDULE_FOR_TODAY_DROP_ID) {
      actions.scheduleTaskForToday(active.id as TaskId)
      return
    }
    if (active.id === over.id) return

    const from = ids.indexOf(active.id as TaskId)
    const to = ids.indexOf(over.id as TaskId)
    if (from < 0 || to < 0) return

    actions.reorderTasks(arrayMove(ids, from, to))
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
        className="mb-4 flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.035] p-1.5 transition-colors duration-150 hover:border-white/[0.16] focus-within:border-primary/50 focus-within:bg-white/[0.055]"
      >
        <div className="relative min-w-0 flex-1">
          <Input
            ref={inputRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => handleComposerKeyDown(event, add, () => setTitle(''))}
            placeholder="Add a task…"
            aria-label="New task"
            className="peer h-9 border-0 bg-transparent pr-20 pl-2 text-sm placeholder:text-hint focus-visible:ring-0 dark:bg-transparent"
          />
          <TaskComposerHint />
        </div>
        <Button
          type="submit"
          size="icon"
          aria-label="Create task"
          className="size-9 shrink-0 rounded-lg"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </Button>
      </form>

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
          ) : state.openTasks.length === 0 && state.doneTasks.length === 0 ? (
            <p className="text-caption px-3 py-6 text-center">
              No tasks planned for this day — add one above.
            </p>
          ) : (
            <>
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <ul className="space-y-0.5">
                  {state.openTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isNow={state.isViewingToday && task.id === state.topOpen?.id}
                      onTick={() => actions.toggleTaskDone(task.id)}
                      onRename={(title) => actions.renameTask(task.id, title)}
                      onRemove={() => actions.removeTask(task.id)}
                    />
                  ))}
                </ul>
              </SortableContext>

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
                        onRename={(title) => actions.renameTask(task.id, title)}
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
            </>
          )}
        </div>

        {draggingId !== null && state.canScheduleForToday ? <ScheduleForTodayRail /> : null}

        <DragOverlay>
          {dragging ? (
            <TaskOverlay
              task={dragging}
              isNow={state.isViewingToday && dragging.id === state.topOpen?.id}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  )
}
