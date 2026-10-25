import type { DayTask } from '@studytrack/backend/convex/tasks/types'
import { Plus } from 'lucide-react'

// The small same-Day picker the popover ships before ST-34 upgrades it to a
// debounced search across Days. It shows every open task of the block's Day that
// is not already here; one that belongs to another unended plan says so, because
// picking it moves the task rather than copying it.
export function PlanTaskPicker({
  tasks,
  assignedTaskIds,
  now,
  onAssign,
}: {
  tasks: DayTask[]
  assignedTaskIds: Set<string>
  now: number
  onAssign: (taskId: DayTask['id']) => void
}) {
  const available = tasks.filter((task) => !task.done && !assignedTaskIds.has(task.id))

  return (
    <div className="mt-3 border-t border-white/6 pt-2.5">
      <p className="text-xs text-muted-foreground">Add a task from this day</p>
      {available.length === 0 ? (
        <p className="mt-1.5 text-xs text-muted-foreground">No open tasks left to add.</p>
      ) : (
        <ul className="mt-2 flex max-h-40 flex-col gap-0.5 overflow-y-auto">
          {available.map((task) => {
            const otherPlan = task.plan && task.plan.plannedEnd > now ? task.plan : null
            return (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onAssign(task.id)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-xs text-foreground/90 transition-colors hover:bg-white/[0.04]"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{task.title}</span>
                  {otherPlan && (
                    <span className="text-caption shrink-0 text-muted-foreground">
                      moves from {otherPlan.title ?? 'another plan'}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
