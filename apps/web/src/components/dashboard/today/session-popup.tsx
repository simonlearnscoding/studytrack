import type { Id } from '@studytrack/backend/convex/_generated/dataModel'
import type { DashboardSessionTask } from '@studytrack/backend/convex/sessions/types'
import { formatDurationHM } from '@studytrack/backend/convex/sessions/util'
import { formatClock, toMinute } from '@studytrack/backend/convex/timeline/util'
import { useState } from 'react'
import { Button } from '~/components/ui/button'

// What the popover renders. Both branches share a member, a window and a task
// list, so the future detail surface (rename, delete, task planning) can build on
// the same shape instead of duplicating the plan/session cases.
type PopupBase = {
  member: string | null
  startAt: number
  endAt: number | null
  tasks: DashboardSessionTask[]
}

export type SessionPopupData =
  | (PopupBase & {
      kind: 'plan'
      planId: Id<'plannedSession'>
      missed: boolean
    })
  | (PopupBase & {
      kind: 'session'
      sessionId: Id<'session'>
      live: boolean
    })

// The shared body for the plan/session popover. Positioning, dismissal and the
// frame belong to the caller (a Radix Popover), so this stays a pure view.
export function SessionPopupContent({
  data,
  dayStart,
  now,
  onRemove,
}: {
  data: SessionPopupData
  dayStart: number
  now: number
  onRemove?: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const endAt = data.endAt ?? now
  const title = data.kind === 'plan' ? 'Planned session' : 'Study session'
  const status =
    data.kind === 'plan' ? (data.missed ? 'Missed' : 'Planned') : data.live ? 'Live' : 'Done'

  return (
    <>
      <div className="text-xs text-muted-foreground">
        <p>
          {status}
          {data.member ? ` · ${data.member}` : ''}
        </p>
        <p className="mt-1 font-semibold text-foreground">{title}</p>
        <p className="mt-1 font-mono">
          {formatClock(toMinute(data.startAt, dayStart))} – {formatClock(toMinute(endAt, dayStart))}{' '}
          · {formatDurationHM(endAt - data.startAt)}
        </p>
      </div>

      <div className="mt-3 border-t border-white/[0.06] pt-2.5">
        <p className="text-xs text-muted-foreground">
          {data.kind === 'plan' ? 'Tasks planned' : 'Tasks in this session'}
        </p>
        {data.tasks.length === 0 ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {data.kind === 'plan'
              ? 'No tasks linked to this plan yet.'
              : 'No tasks in this session.'}
          </p>
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

      {data.kind === 'plan' && onRemove && (
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/[0.06] pt-2.5">
          {confirming ? (
            <>
              <span className="mr-auto text-xs text-muted-foreground">Remove this plan?</span>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
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
              onClick={() => setConfirming(true)}
            >
              Remove plan
            </Button>
          )}
        </div>
      )}
    </>
  )
}
