import { DraftPlanBlockPopup } from './draft-plan-popup'
import { StoredPopup } from './stored-popup'
import type { TimelinePopupData } from './types'

export type { TimelinePopupData } from './types'

// The popover's dispatcher: an uncommitted draft asks for a decision, a stored
// planBlock or workSession shows its details. Positioning, dismissal and the frame
// belong to the caller (a Radix Popover), so this stays a pure view.
export function TimelinePopupContent({
  data,
  dayStart,
  now,
  onRemove,
  onCreate,
  onCancel,
  isCreating = false,
  createError,
}: {
  data: TimelinePopupData
  dayStart: number
  now: number
  onRemove?: () => void
  onCreate?: () => void
  onCancel?: () => void
  isCreating?: boolean
  createError?: string | null
}) {
  if (data.kind === 'draft') {
    return (
      <DraftPlanBlockPopup
        plan={data}
        dayStart={dayStart}
        onCreate={onCreate}
        onCancel={onCancel}
        isCreating={isCreating}
        createError={createError}
      />
    )
  }

  return <StoredPopup data={data} dayStart={dayStart} now={now} onRemove={onRemove} />
}
