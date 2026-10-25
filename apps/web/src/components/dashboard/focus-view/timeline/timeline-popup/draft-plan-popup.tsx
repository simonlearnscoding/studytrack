import type { Task } from '@studytrack/backend/convex/tasks/types'
import { toMinute } from '@studytrack/backend/convex/timeline/util'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { PendingPlanTasks, type PendingPlanTask } from './pending-plan-tasks'
import { PlanBlockFields } from './plan-block-fields'
import {
  planBlockFormError,
  type PlanBlockFormValues,
  type PlanTaskSelection,
} from './plan-block-form'
import { PlanTaskSearch } from './plan-task-search'
import type { DraftPlanBlockPopupData } from './types'
import { PopupWindow } from './window-line'

// Nothing is stored while the draft is open: Create is the only writer, and
// Cancel (or dismissing the popover) leaves no planBlock, Task or assignment
// behind. The gesture's window pre-fills the fields, but both endpoints can be
// corrected here. Picked tasks and typed titles stay pending until Create.
export function DraftPlanBlockPopup({
  plan,
  dayStart,
  now,
  dayTasks,
  onCreate,
  onCancel,
  isCreating,
  createError,
}: {
  plan: DraftPlanBlockPopupData
  dayStart: number
  now: number
  dayTasks: Task[] | undefined
  onCreate?: (values: PlanBlockFormValues, tasks: PlanTaskSelection) => void
  onCancel?: () => void
  isCreating: boolean
  createError?: string | null
}) {
  const [values, setValues] = useState<PlanBlockFormValues>({
    title: '',
    startMin: toMinute(plan.startAt, dayStart),
    endMin: toMinute(plan.endAt, dayStart),
  })
  const [pending, setPending] = useState<PendingPlanTask[]>([])
  const [localError, setLocalError] = useState<string | null>(null)
  const error = localError ?? createError ?? null
  const pendingTaskIds = new Set(
    pending.flatMap((task) => (task.kind === 'existing' ? [task.id] : []))
  )
  const pendingTitles = pending.flatMap((task) => (task.kind === 'new' ? [task.title] : []))

  const changeValues = (next: PlanBlockFormValues) => {
    setValues(next)
    setLocalError(null)
  }

  const addExistingTask = (task: Task) => {
    setPending((current) =>
      current.some((entry) => entry.kind === 'existing' && entry.id === task.id)
        ? current
        : [
            ...current,
            { kind: 'existing', id: task.id, title: task.title, plannedAt: task.plannedAt },
          ]
    )
  }

  const addNewTask = (title: string) => {
    const trimmed = title.trim()
    if (!trimmed) return
    setPending((current) =>
      current.some(
        (entry) => entry.kind === 'new' && entry.title.toLowerCase() === trimmed.toLowerCase()
      )
        ? current
        : [...current, { kind: 'new', title: trimmed }]
    )
  }

  const removePendingTask = (task: PendingPlanTask) => {
    setPending((current) =>
      current.filter((entry) =>
        task.kind === 'existing'
          ? !(entry.kind === 'existing' && entry.id === task.id)
          : !(entry.kind === 'new' && entry.title === task.title)
      )
    )
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
    onCreate?.(values, {
      taskIds: pending.flatMap((task) => (task.kind === 'existing' ? [task.id] : [])),
      newTaskTitles: pending.flatMap((task) => (task.kind === 'new' ? [task.title] : [])),
    })
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

      <PlanTaskSearch
        dayTasks={dayTasks}
        dayStart={dayStart}
        excludedTaskIds={pendingTaskIds}
        reservedTitles={pendingTitles}
        onPick={addExistingTask}
        onCreate={addNewTask}
      />

      <PendingPlanTasks tasks={pending} dayStart={dayStart} onRemove={removePendingTask} />

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
