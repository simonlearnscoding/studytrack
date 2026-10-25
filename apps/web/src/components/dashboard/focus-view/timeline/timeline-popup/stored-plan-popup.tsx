import type { PlanBlockDetail, PlanBlockTask } from '@studytrack/backend/convex/planBlocks/types'
import { planPhase } from '@studytrack/backend/convex/planBlocks/util'
import type { DayTask } from '@studytrack/backend/convex/tasks/types'
import { toMinute } from '@studytrack/backend/convex/timeline/util'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { PlanBlockFields } from './plan-block-fields'
import { planBlockFormError, type PlanBlockFormValues } from './plan-block-form'
import { PlanTaskList } from './plan-task-list'
import { PlanTaskSearch } from './plan-task-search'
import type { StoredPlanBlockPopupData } from './types'
import { PopupWindow } from './window-line'

// A stored planBlock. The name is always editable; the window only before the
// block starts. Save writes both together so the title and window can never
// disagree, and a refused write leaves the popover open with the reason. The task
// list is live from its own read; assignment is owner-only and never offered for
// a past block.
export function StoredPlanPopup({
  data,
  detail,
  dayStart,
  dayTasks,
  now,
  onUpdate,
  onRemove,
  onAssignTask,
  onUnassignTask,
  onCreateTask,
  isUpdating,
  updateError,
  taskError,
}: {
  data: StoredPlanBlockPopupData
  dayStart: number
  detail: PlanBlockDetail | null | undefined
  dayTasks: DayTask[] | undefined
  now: number
  onUpdate?: (values: PlanBlockFormValues) => void
  onRemove?: () => void
  onAssignTask: (taskId: PlanBlockTask['id']) => void
  onUnassignTask: (taskId: PlanBlockTask['id']) => void
  onCreateTask: (title: string) => void
  isUpdating: boolean
  updateError?: string | null
  taskError?: string | null
}) {
  const initialValues: PlanBlockFormValues = {
    title: data.title ?? '',
    startMin: toMinute(data.startAt, dayStart),
    endMin: toMinute(data.endAt ?? data.startAt, dayStart),
  }
  const [values, setValues] = useState(initialValues)
  const [localError, setLocalError] = useState<string | null>(null)
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  const endAt = data.endAt ?? data.startAt
  const phase = planPhase(data.startAt, endAt, now)
  const hasStarted = phase !== 'upcoming'
  const isPast = phase === 'past'
  const isWindowEditable = !hasStarted
  const isOwner = data.isOwner
  const canEditTasks = isOwner && !isPast
  const isDirty =
    values.title !== initialValues.title ||
    values.startMin !== initialValues.startMin ||
    values.endMin !== initialValues.endMin
  const error = localError ?? updateError ?? null
  const tasks = detail?.tasks ?? []
  const assignedTaskIds = new Set(tasks.map((task) => task.id))

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
        <PopupWindow startAt={data.startAt} endAt={endAt} dayStart={dayStart} />
      </div>

      {isOwner ? (
        <PlanBlockFields
          values={values}
          onChange={changeValues}
          isWindowEditable={isWindowEditable}
          error={error}
        />
      ) : (
        <p className="mt-2 text-sm font-semibold text-foreground">
          {data.title ?? 'Untitled plan'}
        </p>
      )}

      {hasStarted && (
        <p className="text-caption text-muted-foreground">
          {isOwner
            ? 'This plan has started, so its time is locked. The title can still change.'
            : 'This plan has started, so its time is locked.'}
        </p>
      )}

      {detail === undefined ? (
        <div className="mt-3 border-t border-white/6 pt-2.5">
          <div className="skeleton h-9 rounded-lg" />
        </div>
      ) : detail === null ? (
        <p className="mt-3 border-t border-white/6 pt-2.5 text-xs text-muted-foreground">
          This plan is no longer available.
        </p>
      ) : (
        <>
          <PlanTaskList
            tasks={tasks}
            dayStart={dayStart}
            plannedStart={detail.plannedStart}
            plannedEnd={detail.plannedEnd}
            isPast={isPast}
            canEdit={canEditTasks}
            onUnassign={onUnassignTask}
          />
          {canEditTasks && (
            <PlanTaskSearch
              dayTasks={dayTasks}
              dayStart={dayStart}
              excludedTaskIds={assignedTaskIds}
              reservedTitles={tasks.map((task) => task.title)}
              onPick={(task) => onAssignTask(task.id)}
              onCreate={onCreateTask}
            />
          )}
        </>
      )}

      {taskError && <p className="text-caption mt-2 text-destructive">{taskError}</p>}

      {isOwner && detail !== null && (
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
      )}
    </>
  )
}
