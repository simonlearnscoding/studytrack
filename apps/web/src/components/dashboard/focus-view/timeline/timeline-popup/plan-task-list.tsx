import type { PlanBlockTask } from '@studytrack/backend/convex/planBlocks/types'
import { countPlanTasks } from '@studytrack/backend/convex/planBlocks/util'
import { DAY_MINUTES } from '@studytrack/backend/convex/timeline/types'
import { formatClock, toMinute } from '@studytrack/backend/convex/timeline/util'
import { X } from 'lucide-react'
import { TaskAction } from '~/components/dashboard/focus-view/tasks/task-action'
import { cn } from '~/lib/utils'

// The stored plan's task list. A past block is the record: read-only, and
// summarised by where each completion actually fell. A live or upcoming block is
// the plan: the owner can still take a task out of it.
export function PlanTaskList({
  tasks,
  dayStart,
  plannedStart,
  plannedEnd,
  isPast,
  canEdit,
  onUnassign,
}: {
  tasks: PlanBlockTask[]
  dayStart: number
  plannedStart: number
  plannedEnd: number
  isPast: boolean
  canEdit: boolean
  onUnassign: (taskId: PlanBlockTask['id']) => void
}) {
  const stats = countPlanTasks(tasks, plannedStart, plannedEnd)

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

      {isPast && tasks.length > 0 && (
        <p className="text-caption mt-2 text-muted-foreground">{statsLine(stats)}</p>
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

function statsLine(stats: ReturnType<typeof countPlanTasks>): string {
  const parts = [`${stats.doneInside} done inside`]
  if (stats.doneOutside > 0) parts.push(`${stats.doneOutside} done outside`)
  if (stats.doneUnknownTime > 0) parts.push(`${stats.doneUnknownTime} done, time unknown`)
  if (stats.open > 0) parts.push(`${stats.open} not done`)
  return parts.join(' · ')
}
