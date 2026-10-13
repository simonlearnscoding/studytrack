import type { Task } from '@studytrack/backend/convex/tasks/types'
import { Check, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '~/lib/utils'

// One task row: the whole row toggles, the checkbox carries the state. A trailing
// actions area (rename, and delete on Open rows) shows on hover or focus.
export function TaskRow({
  task,
  onToggle,
  onRename,
  onRemove,
}: {
  task: Task
  onToggle: () => void
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
    <li className="group/row relative">
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
          className="h-[38px] w-full rounded-lg border border-input bg-background/60 px-2.5 text-sm text-foreground focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-secondary/70"
        >
          <span
            className={cn(
              'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-colors',
              task.done
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-transparent group-hover:border-muted-foreground/60'
            )}
          >
            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
          </span>
          <span
            className={cn(
              'truncate text-sm leading-5',
              task.done ? 'text-muted-foreground line-through' : 'text-foreground'
            )}
          >
            {task.title}
          </span>
        </button>
      )}

      {!editing && (
        <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100">
          {!task.done && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onRemove()
              }}
              aria-label="Delete task"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              startEditing()
            }}
            aria-label="Rename task"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}
    </li>
  )
}
