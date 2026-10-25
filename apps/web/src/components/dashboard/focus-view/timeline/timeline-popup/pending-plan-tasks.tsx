import type { Id } from '@studytrack/backend/convex/_generated/dataModel'
import { X } from 'lucide-react'
import { TaskAction } from '~/components/dashboard/focus-view/tasks/task-action'
import { taskDayLabel } from './task-day-label'

// What the draft has picked but not written yet. Nothing here exists on the
// server until Create, so Cancel leaves no trace.
export type PendingPlanTask =
  | { kind: 'existing'; id: Id<'task'>; title: string; plannedAt: number }
  | { kind: 'new'; title: string }

export function PendingPlanTasks({
  tasks,
  dayStart,
  onRemove,
}: {
  tasks: PendingPlanTask[]
  dayStart: number
  onRemove: (task: PendingPlanTask) => void
}) {
  if (tasks.length === 0) return null

  return (
    <ul className="mt-2 flex max-h-32 flex-col gap-0.5 overflow-y-auto">
      {tasks.map((task) => (
        <li
          key={task.kind === 'existing' ? task.id : `new-${task.title.toLowerCase()}`}
          className="flex items-center gap-2 text-xs"
        >
          <span className="min-w-0 flex-1 truncate text-foreground/90">{task.title}</span>
          <span className="text-caption shrink-0 text-muted-foreground">
            {task.kind === 'existing' ? taskDayLabel(task.plannedAt, dayStart) : 'new'}
          </span>
          <TaskAction label={`Remove ${task.title} from this plan`} onClick={() => onRemove(task)}>
            <X className="h-3 w-3" aria-hidden />
          </TaskAction>
        </li>
      ))}
    </ul>
  )
}
