import { useDayStart } from '~/hooks/use-day-start'
import { AddTaskForm } from './add-task-form'
import { useMyTasks } from './hooks'
import { TaskRow } from './task-row'

// The member's task list for today, managed from the self rail. Task content is
// public (ADR-0007): the room reads the same titles on the rail and live card. On
// wide rails the card grows to absorb whatever height the other cards leave
// over, pinning stats and motivation to the rail's bottom; it never shrinks
// below its own content — a genuinely tall rail just scrolls as before.
export function TaskList() {
  const dayStart = useDayStart()
  const { tasks, create, toggle, rename, remove, open } = useMyTasks(dayStart)

  return (
    <div className="flex flex-col gap-3 lg:flex-1">
      <div className="flex items-center gap-2">
        <h2 className="text-label">Tasks</h2>
        <span className="rounded-full bg-secondary px-2 text-[11px] leading-5 tabular-nums text-muted-foreground">
          {open} open
        </span>
      </div>
      <div className="card-surface flex flex-col border-primary/25 p-4 lg:flex-1">
        <AddTaskForm create={create} compact />

        {tasks === undefined ? (
          <div className="skeleton mt-4 h-16 rounded-lg" />
        ) : tasks.length === 0 ? (
          <p className="mt-4 px-1 text-sm text-muted-foreground/80">
            No tasks yet. Add one to plan your session.
          </p>
        ) : (
          <ul className="mt-3 space-y-0.5">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() => toggle({ taskId: task.id })}
                onRename={(title) => rename({ taskId: task.id, title })}
                onRemove={() => remove({ taskId: task.id })}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
