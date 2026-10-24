import { formatClock, toMinute } from '@studytrack/backend/convex/timeline/util'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import type { StoredPopupData } from './types'
import { PopupWindow } from './window-line'

// A stored Plan or Session. Both answer "what is this block on the lane?", so
// they share the frame; only the vocabulary and the remove action differ.
export function StoredPopup({
  data,
  dayStart,
  now,
  onRemove,
}: {
  data: StoredPopupData
  dayStart: number
  now: number
  onRemove?: () => void
}) {
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const isPlan = data.kind === 'plan'
  const endAt = data.endAt ?? now
  const status = isPlan ? (data.missed ? 'Missed' : 'Planned') : data.live ? 'Live' : 'Done'
  const kindLabel = isPlan ? 'Plan' : 'Study session'
  const tasksHeading = isPlan ? 'Tasks planned' : 'Tasks in this session'
  const emptyTasksMessage = isPlan
    ? 'No tasks linked to this plan yet.'
    : 'No tasks in this session.'

  return (
    <>
      <div className="text-xs text-muted-foreground">
        <p>
          {status}
          {data.member ? ` · ${data.member}` : ''}
        </p>
        <p className="mt-1 font-semibold text-foreground">{kindLabel}</p>
        <PopupWindow startAt={data.startAt} endAt={endAt} dayStart={dayStart} />
      </div>

      <div className="mt-3 border-t border-white/6 pt-2.5">
        <p className="text-xs text-muted-foreground">{tasksHeading}</p>
        {data.tasks.length === 0 ? (
          <p className="mt-1.5 text-xs text-muted-foreground">{emptyTasksMessage}</p>
        ) : (
          <ul className="mt-2 flex max-h-56 flex-col gap-2 overflow-y-auto">
            {data.tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-start justify-between gap-3 text-xs text-muted-foreground"
              >
                <span className="min-w-0 text-foreground/90">{task.title}</span>
                <span className="shrink-0 font-mono">
                  {task.completedAt !== null
                    ? `done ${formatClock(toMinute(task.completedAt, dayStart))}`
                    : task.planned
                      ? 'planned'
                      : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isPlan && onRemove && (
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/6 pt-2.5">
          {confirmingRemove ? (
            <>
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
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmingRemove(true)}
            >
              Remove plan
            </Button>
          )}
        </div>
      )}
    </>
  )
}
