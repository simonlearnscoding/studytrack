import { toMinute } from '@studytrack/backend/convex/timeline/util'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { PlanBlockFields } from './plan-block-fields'
import { planBlockFormError, type PlanBlockFormValues } from './plan-block-form'
import type { DraftPlanBlockPopupData } from './types'
import { PopupWindow } from './window-line'

// Nothing is stored while the draft is open: Create is the only writer, and
// Cancel (or dismissing the popover) leaves no planBlock behind. The gesture's
// window pre-fills the fields, but both endpoints can be corrected here.
export function DraftPlanBlockPopup({
  plan,
  dayStart,
  now,
  onCreate,
  onCancel,
  isCreating,
  createError,
}: {
  plan: DraftPlanBlockPopupData
  dayStart: number
  now: number
  onCreate?: (values: PlanBlockFormValues) => void
  onCancel?: () => void
  isCreating: boolean
  createError?: string | null
}) {
  const [values, setValues] = useState<PlanBlockFormValues>({
    title: '',
    startMin: toMinute(plan.startAt, dayStart),
    endMin: toMinute(plan.endAt, dayStart),
  })
  const [localError, setLocalError] = useState<string | null>(null)
  const error = localError ?? createError ?? null

  const changeValues = (next: PlanBlockFormValues) => {
    setValues(next)
    setLocalError(null)
  }

  const create = () => {
    const message = planBlockFormError({
      values,
      nowMin: toMinute(now, dayStart),
      isWindowEditable: true,
    })
    if (message) {
      setLocalError(message)
      return
    }
    onCreate?.(values)
  }

  return (
    <>
      <div className="text-caption text-muted-foreground">
        <p className="text-body font-semibold text-foreground">New plan block</p>
        <PopupWindow
          startAt={dayStart + values.startMin * 60_000}
          endAt={dayStart + values.endMin * 60_000}
          dayStart={dayStart}
        />
      </div>

      <PlanBlockFields
        values={values}
        onChange={changeValues}
        isWindowEditable
        error={error}
        autoFocusTitle
      />

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/6 pt-2.5">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={create} disabled={isCreating}>
          Create
        </Button>
      </div>
    </>
  )
}
