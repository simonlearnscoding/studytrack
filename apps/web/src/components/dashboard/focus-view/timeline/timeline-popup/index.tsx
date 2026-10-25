import type { PlanBlockDetail, PlanBlockTask } from '@studytrack/backend/convex/planBlocks/types'
import type { DayTask } from '@studytrack/backend/convex/tasks/types'
import { DraftPlanBlockPopup } from './draft-plan-popup'
import type { PlanBlockFormValues } from './plan-block-form'
import { StoredPlanPopup } from './stored-plan-popup'
import { StoredWorkSessionPopup } from './stored-work-session-popup'
import type { TimelinePopupData } from './types'

export type { PlanBlockFormValues } from './plan-block-form'
export type { TimelinePopupData } from './types'

// The popover's dispatcher: an uncommitted draft asks for a decision, a stored
// planBlock is editable, and a workSession shows what the clock recorded.
// Positioning, dismissal and the frame belong to the caller (a Radix Popover),
// so this stays a pure view.
export function TimelinePopupContent({
  data,
  dayStart,
  now,
  planDetail,
  planDayTasks,
  onRemove,
  onCreate,
  onUpdate,
  onCancel,
  onAssignTask,
  onUnassignTask,
  isCreating = false,
  isUpdating = false,
  createError,
  updateError,
  taskError,
}: {
  data: TimelinePopupData
  dayStart: number
  now: number
  planDetail?: PlanBlockDetail | null
  planDayTasks?: DayTask[]
  onRemove?: () => void
  onCreate?: (values: PlanBlockFormValues) => void
  onUpdate?: (values: PlanBlockFormValues) => void
  onCancel?: () => void
  onAssignTask?: (taskId: PlanBlockTask['id']) => void
  onUnassignTask?: (taskId: PlanBlockTask['id']) => void
  isCreating?: boolean
  isUpdating?: boolean
  createError?: string | null
  updateError?: string | null
  taskError?: string | null
}) {
  if (data.kind === 'draft') {
    return (
      <DraftPlanBlockPopup
        plan={data}
        dayStart={dayStart}
        now={now}
        onCreate={onCreate}
        onCancel={onCancel}
        isCreating={isCreating}
        createError={createError}
      />
    )
  }

  if (data.kind === 'planBlock') {
    return (
      <StoredPlanPopup
        data={data}
        detail={planDetail}
        dayStart={dayStart}
        dayTasks={planDayTasks}
        now={now}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onAssignTask={onAssignTask ?? noop}
        onUnassignTask={onUnassignTask ?? noop}
        isUpdating={isUpdating}
        updateError={updateError}
        taskError={taskError}
      />
    )
  }

  return <StoredWorkSessionPopup data={data} dayStart={dayStart} now={now} />
}

function noop() {}
