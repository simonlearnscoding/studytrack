import { useState } from 'react'
import { MainQueueSection } from '../../main-queue-section'
import type { DayTaskQueue, TaskId } from '../../task-types'
import { DoneTaskGroup } from './done-task-group'
import { PlanGroupList } from './plan-group-list'

// The pane's scroll area: the loading placeholder, the whole-Day empty line, or
// the Day's sections — the live plan, the unassigned queue, the upcoming plans,
// then Done. Folds are local to this revision, so they live here rather than in
// the pane's props.
export function TaskPaneBody({
  queue,
  nowTaskId,
  highlightedPlanBlockId,
  isDraggingPlanTask,
}: {
  queue: DayTaskQueue
  nowTaskId: TaskId | null
  highlightedPlanBlockId: string | null
  isDraggingPlanTask: boolean
}) {
  const { state, actions } = queue
  const [foldedPlanGroupIds, setFoldedPlanGroupIds] = useState<Set<string>>(new Set())

  const togglePlanGroup = (planBlockId: string) => {
    setFoldedPlanGroupIds((current) => {
      const next = new Set(current)
      if (next.has(planBlockId)) next.delete(planBlockId)
      else next.add(planBlockId)
      return next
    })
  }

  const livePlanGroups = state.livePlanGroup ? [state.livePlanGroup] : []
  const hasPlanGroups = state.livePlanGroup !== null || state.upcomingPlanGroups.length > 0
  const isEmpty = state.openTasks.length === 0 && state.doneTasks.length === 0 && !hasPlanGroups

  return (
    <div className="min-h-0 flex-1 overflow-y-auto max-lg:overflow-visible">
      {state.status === 'loading' ? (
        <div className="skeleton h-16 rounded-lg" />
      ) : isEmpty ? (
        <p className="text-caption px-3 py-6 text-center">
          No tasks planned for this day — add one above.
        </p>
      ) : (
        <div className="space-y-3">
          <PlanGroupList
            groups={livePlanGroups}
            queue={queue}
            nowTaskId={nowTaskId}
            foldedPlanGroupIds={foldedPlanGroupIds}
            onToggleGroup={togglePlanGroup}
            highlightedPlanBlockId={highlightedPlanBlockId}
          />

          <MainQueueSection
            tasks={state.unassignedTasks}
            nowTaskId={nowTaskId}
            isViewingToday={state.isViewingToday}
            isDraggingPlanTask={isDraggingPlanTask}
            hasPlanGroups={hasPlanGroups}
            todayStart={state.todayStart}
            rescheduleTask={actions.rescheduleTask}
            actions={actions}
          />

          <PlanGroupList
            groups={state.upcomingPlanGroups}
            queue={queue}
            nowTaskId={nowTaskId}
            foldedPlanGroupIds={foldedPlanGroupIds}
            onToggleGroup={togglePlanGroup}
            highlightedPlanBlockId={highlightedPlanBlockId}
          />

          {state.doneTasks.length > 0 ? (
            <DoneTaskGroup tasks={state.doneTasks} actions={actions} />
          ) : null}
        </div>
      )}
    </div>
  )
}
