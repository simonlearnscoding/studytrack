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
  onRemove,
  onCreate,
  onUpdate,
  onCancel,
  isCreating = false,
  isUpdating = false,
  createError,
  updateError,
}: {
  data: TimelinePopupData
  dayStart: number
  now: number
  onRemove?: () => void
  onCreate?: (values: PlanBlockFormValues) => void
  onUpdate?: (values: PlanBlockFormValues) => void
  onCancel?: () => void
  isCreating?: boolean
  isUpdating?: boolean
  createError?: string | null
  updateError?: string | null
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
        dayStart={dayStart}
        now={now}
        onUpdate={onUpdate}
        onRemove={onRemove}
        isUpdating={isUpdating}
        updateError={updateError}
      />
    )
  }

  return <StoredWorkSessionPopup data={data} dayStart={dayStart} now={now} />
}
