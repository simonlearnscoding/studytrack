import type { PlanBlockTask } from '@studytrack/backend/convex/planBlocks/types'
import { DAY_MINUTES } from '@studytrack/backend/convex/timeline/types'
import { formatClock, toMinute } from '@studytrack/backend/convex/timeline/util'
import { X } from 'lucide-react'
import { TaskAction } from '~/components/dashboard/focus-view/tasks/task-action'
import { cn } from '~/lib/utils'

// The stored plan's task list, at any phase. The owner can add to it and take a
// task out of it whenever the block exists; there is no archive to protect
// (ADR-0015).
export function PlanTaskList({
  tasks,
  dayStart,
  canEdit,
  onUnassign,
}: {
  tasks: PlanBlockTask[]
  dayStart: number
  canEdit: boolean
  onUnassign: (taskId: PlanBlockTask['id']) => void
}) {
  return (
    <div className="mt-3 border-t border-white/6 pt-2.5">
      <p className="text-xs text-muted-foreground">Tasks planned</p>
      {tasks.length === 0 ? (
        <p className="mt-1.5 text-xs text-muted-foreground">No tasks in this plan.</p>
      ) : (
        <ul className="mt-2 flex max-h-56 flex-col gap-2 overflow-y-auto">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-start justify-between gap-2 text-xs">
              <span
                className={cn(
                  'min-w-0 flex-1 break-words',
                  task.done ? 'text-subtle-foreground line-through' : 'text-foreground/90'
                )}
              >
                {task.title}
              </span>
              <span className="shrink-0 text-right font-mono text-muted-foreground">
                {doneLabel(task, dayStart)}
              </span>
              {canEdit && (
                <TaskAction
                  label={`Remove ${task.title} from this plan`}
                  onClick={() => onUnassign(task.id)}
                >
                  <X className="h-3 w-3" aria-hidden />
                </TaskAction>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function doneLabel(task: PlanBlockTask, dayStart: number): string {
  if (!task.done) return 'open'
  if (task.completedAt === null) return 'done · no time'
  const minute = toMinute(task.completedAt, dayStart)
  if (minute < 0 || minute >= DAY_MINUTES) return 'done · another day'
  return `done ${formatClock(minute)}`
}
