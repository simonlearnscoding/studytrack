import { DraftPlanPopup } from './draft-plan-popup'
import { StoredPopup } from './stored-popup'
import type { SessionPopupData } from './types'

export type { SessionPopupData } from './types'

// The popover's dispatcher: an uncommitted draft asks for a decision, a stored
// Plan or Session shows its details. Positioning, dismissal and the frame
// belong to the caller (a Radix Popover), so this stays a pure view.
export function SessionPopupContent({
  data,
  dayStart,
  now,
  onRemove,
  onCreate,
  onCancel,
  isCreating = false,
  createError,
}: {
  data: SessionPopupData
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
      <DraftPlanPopup
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
