import { Pencil, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Checkbox } from '~/components/ui/checkbox'
import { cn } from '~/lib/utils'
import type { QueueTask } from './task-types'

// One row in the desktop task pane: tap the body to set it active, the checkbox
// completes it, and a trailing actions area (clear active, delete, rename) shows
// on hover or focus. Rename swaps the row for an inline input.
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
        'group/row relative flex items-start gap-2.5 border-b border-white/[0.04] px-2 py-2.5 last:border-0',
        task.active && 'rounded-md bg-primary/[0.06]'
      )}
    >
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
        <>
          <Checkbox
            checked={!!task.done}
            onCheckedChange={onTick}
            className="mt-0.5 h-5 w-5 rounded-md"
          />
          <button
            type="button"
            onClick={onSetActive}
            disabled={task.done}
            className="min-w-0 flex-1 cursor-pointer pr-16 text-left disabled:cursor-default"
          >
            <p
              className={cn(
                'text-sm leading-normal',
                task.done ? 'text-subtle-foreground line-through' : 'text-white/85'
              )}
            >
              {task.active && (
                <span className="bg-primary-tint text-primary mr-1.5 rounded px-1 py-0.5 align-[1px] font-mono text-label">
                  NOW
                </span>
              )}
              {!task.active && !task.done && isNext && (
                <span className="border-border text-muted-foreground mr-1.5 rounded border px-1 py-0.5 align-[1px] font-mono text-label">
                  NEXT
                </span>
              )}
              {task.title}
              {task.doneAt && (
                <span className="text-subtle-foreground ml-1.5 font-mono text-caption">
                  {task.doneAt}
                </span>
              )}
            </p>
          </button>
        </>
      )}

      {!editing && (
        <div className="absolute top-1 right-1.5 flex items-center gap-0.5">
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100">
            <button
              type="button"
              onClick={onRemove}
              aria-label="Delete task"
              className="text-muted-foreground hover:text-foreground flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-secondary"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={startEditing}
              aria-label="Rename task"
              className="text-muted-foreground hover:text-foreground flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-secondary"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          {task.active && (
            <button
              type="button"
              onClick={onClear}
              aria-label="End active task"
              className="bg-primary-tint text-primary ring-primary/40 hover:bg-primary/20 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md ring-1 ring-inset transition-colors"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
