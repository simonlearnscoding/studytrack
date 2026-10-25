import { formatClock, toMinute } from '@studytrack/backend/convex/timeline/util'
import type { DashboardWorkSessionTask } from '@studytrack/backend/convex/workSessions/types'

// The task list both stored popovers share. A plan block names what it intends
// to work on; a work session names what it actually did.
export function PopupTasks({
  heading,
  emptyMessage,
  tasks,
  dayStart,
}: {
  heading: string
  emptyMessage: string
  tasks: DashboardWorkSessionTask[]
  dayStart: number
}) {
  return (
    <div className="mt-3 border-t border-white/6 pt-2.5">
      <p className="text-xs text-muted-foreground">{heading}</p>
      {tasks.length === 0 ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="mt-2 flex max-h-56 flex-col gap-2 overflow-y-auto">
          {tasks.map((task) => (
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
  )
}
