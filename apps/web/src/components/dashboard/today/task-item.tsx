import { Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Checkbox } from '~/components/ui/checkbox'
import { cn } from '~/lib/utils'
import { TaskAction } from './task-action'
import type { QueueTask } from './task-types'

// One row in the desktop task pane. The checkbox stays visible on every row and
// is the complete control; the actions on the right start/stop the task, rename
// it, or delete it. An active task swaps its start button for complete + stop.
export function TaskItem({
  task,
  isNext,
  onSetActive,
  onTick,
  onClear,
  onRename,
  onRemove,
}: {
  task: QueueTask
  isNext?: boolean
  onSetActive: () => void
  onTick: () => void
  onClear: () => void
  onRename: (title: string) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)

  const startEditing = () => {
    setDraft(task.title)
    setEditing(true)
  }

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== task.title) onRename(trimmed)
    setEditing(false)
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b border-white/[0.04] px-2 py-2.5 last:border-0',
        task.active && 'rounded-md bg-primary/[0.06]'
      )}
    >
      <Checkbox checked={task.done} onCheckedChange={onTick} />

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            } else if (event.key === 'Escape') {
              setDraft(task.title)
              setEditing(false)
            }
          }}
          aria-label="Task title"
          className="h-[34px] min-w-0 flex-1 rounded-lg border border-input bg-background/60 px-2.5 text-sm text-foreground focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="flex min-w-0 items-center gap-1.5 text-sm leading-normal">
            {task.active && (
              <span className="bg-primary-tint text-primary shrink-0 rounded px-1 py-0.5 font-mono text-label">
                NOW
              </span>
            )}
            <span
              className={cn(
                'min-w-0 truncate',
                task.done ? 'text-subtle-foreground line-through' : 'text-white/85'
              )}
            >
              {task.title}
            </span>
            {task.doneAt && (
              <span className="text-subtle-foreground shrink-0 font-mono text-caption">
                {task.doneAt}
              </span>
            )}
          </p>
          {!task.active && !task.done && isNext && (
            <span className="text-label border-border text-muted-foreground flex w-max items-center gap-1 rounded border px-1 py-0.5 font-mono">
              <span className="bg-primary h-1 w-1 rounded-full" />
              NEXT
            </span>
          )}
        </div>
      )}

      {!editing && (
        <div className="flex shrink-0 items-center gap-0.5">
          {!task.done &&
            (task.active ? (
              <TaskAction label="Stop working" onClick={onClear}>
                <Pause className="h-3.5 w-3.5" aria-hidden />
              </TaskAction>
            ) : (
              <TaskAction label="Start working" onClick={onSetActive} accent>
                <Play className="ml-0.5 h-3.5 w-3.5 fill-current" aria-hidden />
              </TaskAction>
            ))}
          <TaskAction label="Rename task" onClick={startEditing}>
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </TaskAction>
          <TaskAction label="Delete task" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </TaskAction>
        </div>
      )}
    </div>
  )
}
