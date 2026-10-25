import { toMinute } from '@studytrack/backend/convex/timeline/util'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { PlanBlockFields } from './plan-block-fields'
import { planBlockFormError, type PlanBlockFormValues } from './plan-block-form'
import { PopupTasks } from './popup-tasks'
import type { StoredPlanBlockPopupData } from './types'

// A stored planBlock. The name is always editable; the window only before the
// block starts. Save writes both together so the title and window can never
// disagree, and a refused write leaves the popover open with the reason.
export function StoredPlanPopup({
  data,
  dayStart,
  now,
  onUpdate,
  onRemove,
  isUpdating,
  updateError,
}: {
  data: StoredPlanBlockPopupData
  dayStart: number
  now: number
  onUpdate?: (values: PlanBlockFormValues) => void
  onRemove?: () => void
  isUpdating: boolean
  updateError?: string | null
}) {
  const initialValues: PlanBlockFormValues = {
    title: data.title ?? '',
    startMin: toMinute(data.startAt, dayStart),
    endMin: toMinute(data.endAt ?? data.startAt, dayStart),
  }
  const [values, setValues] = useState(initialValues)
  const [localError, setLocalError] = useState<string | null>(null)
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  const hasStarted = data.startAt <= now
  const isWindowEditable = !hasStarted
  const isDirty =
    values.title !== initialValues.title ||
    values.startMin !== initialValues.startMin ||
    values.endMin !== initialValues.endMin
  const error = localError ?? updateError ?? null

  const changeValues = (next: PlanBlockFormValues) => {
    setValues(next)
    setLocalError(null)
  }

  const save = () => {
    const message = planBlockFormError({
      values,
      nowMin: toMinute(now, dayStart),
      isWindowEditable,
    })
    if (message) {
      setLocalError(message)
      return
    }
    onUpdate?.(values)
  }

  return (
    <>
      <div className="text-xs text-muted-foreground">
        <p>
          {data.missed ? 'Missed' : 'Planned'}
          {data.member ? ` · ${data.member}` : ''}
        </p>
        <p className="mt-1 font-semibold text-foreground">Plan block</p>
      </div>

      <PlanBlockFields
        values={values}
        onChange={changeValues}
        isWindowEditable={isWindowEditable}
        error={error}
      />

      <PopupTasks
        heading="Tasks planned"
        emptyMessage="No tasks linked to this plan yet."
        tasks={data.tasks}
        dayStart={dayStart}
      />

      <div className="mt-3 border-t border-white/6 pt-2.5">
        {confirmingRemove ? (
          <div className="flex items-center justify-end gap-2">
            <span className="mr-auto text-xs text-muted-foreground">Remove this plan?</span>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingRemove(false)}>
              Cancel
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={onRemove}
            >
              Remove
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {!hasStarted && onRemove ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmingRemove(true)}
              >
                Remove plan
              </Button>
            ) : (
              <span />
            )}
            <Button size="sm" onClick={save} disabled={!isDirty || isUpdating}>
              Save
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
