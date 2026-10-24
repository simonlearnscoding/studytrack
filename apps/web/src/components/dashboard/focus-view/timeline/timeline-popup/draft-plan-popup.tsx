import { Button } from '~/components/ui/button'
import type { DraftPlanBlockPopupData } from './types'
import { PopupWindow } from './window-line'

// Nothing is stored while the draft is open: Create is the only writer, and
// Cancel (or dismissing the popover) leaves no planBlock behind.
export function DraftPlanBlockPopup({
  plan,
  dayStart,
  onCreate,
  onCancel,
  isCreating,
  createError,
}: {
  plan: DraftPlanBlockPopupData
  dayStart: number
  onCreate?: () => void
  onCancel?: () => void
  isCreating: boolean
  createError?: string | null
}) {
  return (
    <>
      <div className="text-caption text-muted-foreground">
        <p className="text-body font-semibold text-foreground">New plan block</p>
        <PopupWindow startAt={plan.startAt} endAt={plan.endAt} dayStart={dayStart} />
      </div>

      {createError && <p className="mt-2 text-caption text-destructive">{createError}</p>}

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/6 pt-2.5">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onCreate} disabled={isCreating}>
          Create
        </Button>
      </div>
    </>
  )
}
