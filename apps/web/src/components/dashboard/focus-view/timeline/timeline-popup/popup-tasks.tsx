import { formatClock, toMinute } from '@studytrack/backend/convex/timeline/util'
import type { DashboardWorkSessionTask } from '@studytrack/backend/convex/workSessions/types'

// The task list a stored work session shows: what was actually finished inside
// its span. Plan blocks read their tasks from their own live query.
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
                  : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
