import type { Id } from '@studytrack/backend/convex/_generated/dataModel'
import type { DashboardSessionTask } from '@studytrack/backend/convex/sessions/types'
import { formatDurationHM } from '@studytrack/backend/convex/sessions/util'
import { formatClock, toMinute } from '@studytrack/backend/convex/timeline/util'
import { useEffect } from 'react'
import { Button } from '~/components/ui/button'

// What the popup renders. Both branches share a member, a window and a task list,
// so a future detail surface (rename, delete, task planning) can build on the
// same shape instead of duplicating the plan/session cases.
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

// The shared detail popup for a planned session and a real session. Deliberately
// read-only for now: it proves the interaction and the shape the actions will
// hang off later.
export function SessionPopup({
  data,
  dayStart,
  now,
  onClose,
}: {
  data: SessionPopupData | null
  dayStart: number
  now: number
  onClose: () => void
}) {
  useEffect(() => {
    if (!data) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [data, onClose])

  if (!data) return null

  const endAt = data.endAt ?? now
  const title = data.kind === 'plan' ? 'Planned session' : 'Study session'
  const status =
    data.kind === 'plan' ? (data.missed ? 'Missed' : 'Planned') : data.live ? 'Live' : 'Done'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-popup-title"
        onClick={(event) => event.stopPropagation()}
        className="card-surface shadow-popover w-full max-w-md p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-label">{status}</span>
            <h2 id="session-popup-title" className="text-title mt-1.5">
              {title}
            </h2>
            {data.member && <p className="text-caption mt-0.5">{data.member}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} autoFocus>
            Close
          </Button>
        </div>

        <div className="mt-4 flex items-baseline gap-2 font-mono">
          <span className="text-metric text-foreground">
            {formatClock(toMinute(data.startAt, dayStart))} –{' '}
            {formatClock(toMinute(endAt, dayStart))}
          </span>
          <span className="text-caption">{formatDurationHM(endAt - data.startAt)}</span>
        </div>

        <div className="mt-5 border-t border-white/[0.06] pt-4">
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
            <ul className="mt-2 flex flex-col gap-2">
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
      </div>
    </div>
  )
}
