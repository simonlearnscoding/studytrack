import { DndContext, DragOverlay } from '@dnd-kit/core'
import { useEffect, useState } from 'react'
import { PlanBlockButton } from '../plan-block-button'
import { ScheduleForTodayRail } from '../dnd/schedule-for-today-rail'
import { taskPaneCollisionDetection } from '../dnd/task-pane-collision'
import { useTaskPaneDrag } from '../hooks/use-task-pane-drag'
import { TaskOverlay } from '../task-overlay'
import type { DayTaskQueue, TaskId } from '../task-types'
import { buildTaskPaneAnnouncements, taskPaneDragInstructions } from './announcements'
import { TaskComposerForm } from './view/task-composer-form'
import { TaskPaneBody } from './view/task-pane-body'

// The Day's task pane: the pane chrome (Day heading, composer, plan button), the
// one DndContext every row lives in, and the two drag-time affordances that sit
// outside the scrolling list. The sections themselves are TaskPaneBody's.
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
  const [highlightedPlanBlockId, setHighlightedPlanBlockId] = useState<string | null>(null)
  const { draggingId, draggingTask, isDraggingPlanTask, sensors, startDrag, endDrag, cancelDrag } =
    useTaskPaneDrag({ state, actions })

  const livePlanGroup = state.livePlanGroup
  const planGroups = [...(livePlanGroup ? [livePlanGroup] : []), ...state.upcomingPlanGroups]
  const openTaskCount = state.openTasks.length

  useEffect(() => {
    if (highlightedPlanBlockId === null) return
    const timer = setTimeout(() => setHighlightedPlanBlockId(null), 2000)
    return () => clearTimeout(timer)
  }, [highlightedPlanBlockId])

  const announcements = buildTaskPaneAnnouncements({ state, planGroups })

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
      <TaskComposerForm onAdd={actions.addTask} />

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
        onDragCancel={cancelDrag}
        accessibility={{ announcements, screenReaderInstructions: taskPaneDragInstructions }}
      >
        <TaskPaneBody
          queue={queue}
          nowTaskId={nowTaskId}
          highlightedPlanBlockId={highlightedPlanBlockId}
          isDraggingPlanTask={isDraggingPlanTask}
        />

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
