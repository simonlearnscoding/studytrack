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
      <div className="min-w-0">
        <span className="text-label">{status}</span>
        <h2 className="text-title mt-1.5">{title}</h2>
        {data.member && <p className="text-caption mt-0.5">{data.member}</p>}
      </div>

      <div className="mt-3 flex items-baseline gap-2 font-mono">
        <span className="text-metric text-foreground">
          {formatClock(toMinute(data.startAt, dayStart))} – {formatClock(toMinute(endAt, dayStart))}
        </span>
        <span className="text-caption">{formatDurationHM(endAt - data.startAt)}</span>
      </div>

      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <span className="text-label">
          {data.kind === 'plan' ? 'Tasks planned' : 'Tasks in this session'}
        </span>
        {data.tasks.length === 0 ? (
          <p className="text-caption mt-2">
            {data.kind === 'plan'
              ? 'No tasks linked to this plan yet.'
              : 'No tasks in this session.'}
          </p>
        ) : (
          <ul className="mt-2 flex max-h-56 flex-col gap-2 overflow-y-auto">
            {data.tasks.map((task) => (
              <li key={task.id} className="flex items-start justify-between gap-3">
                <span className="text-body min-w-0">{task.title}</span>
                <span className="text-caption shrink-0 font-mono">
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
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/[0.06] pt-3">
          {confirming ? (
            <>
              <span className="text-caption mr-auto">Remove this plan?</span>
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
