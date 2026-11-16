import { PlanGroupSection } from '../../plan-group-section'
import type { DayTaskQueue, PlanGroup, TaskId } from '../../task-types'

// A Day's plan groups as one list, so the live group and the upcoming ones share
// exactly one prop set. The body renders it twice — live above the main queue,
// upcoming below — because the unassigned rows sit between them.
export function PlanGroupList({
  groups,
  queue,
  nowTaskId,
  foldedPlanGroupIds,
  onToggleGroup,
  highlightedPlanBlockId,
}: {
  groups: PlanGroup[]
  queue: DayTaskQueue
  nowTaskId: TaskId | null
  foldedPlanGroupIds: Set<string>
  onToggleGroup: (planBlockId: string) => void
  highlightedPlanBlockId: string | null
}) {
  const { state, actions } = queue

  return (
    <>
      {groups.map((group) => (
        <PlanGroupSection
          key={group.planBlockId}
          group={group}
          isExpanded={!foldedPlanGroupIds.has(group.planBlockId)}
          onToggle={() => onToggleGroup(group.planBlockId)}
          isFresh={highlightedPlanBlockId === group.planBlockId}
          nowTaskId={nowTaskId}
          isViewingToday={state.isViewingToday}
          todayStart={state.todayStart}
          rescheduleTask={actions.rescheduleTask}
          actions={actions}
        />
      ))}
    </>
  )
}
