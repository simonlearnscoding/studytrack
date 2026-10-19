import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'
import type { DockTask } from './types'

// The expandable half of the dock: a bottom sheet holding the full task list,
// the composer, and the tracking toggle. Slides up over a scrim; the bar stays
// put underneath, so "now" never leaves the screen.
export function TaskSheet({
  open,
  live,
  tasks,
  onClose,
  onAdd,
  onTick,
  onSetActive,
  onClear,
  onRename,
  onRemove,
  onToggleTracking,
}: {
  open: boolean
  live: boolean
  tasks: DockTask[]
  onClose: () => void
  onAdd: (title: string) => void
  onTick: (id: string) => void
  onSetActive: (id: string) => void
  onClear: () => void
  onRename: (id: string, title: string) => void
  onRemove: (id: string) => void
  onToggleTracking: () => void
}) {
  const [title, setTitle] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    setTitle('')
    onAdd(trimmed)
  }

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tasks"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[76dvh] flex-col rounded-t-2xl border border-b-0 border-border bg-popover pb-[calc(1.125rem+env(safe-area-inset-bottom))] transition-transform duration-300 ease-out lg:hidden',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-white/15" />

        <div className="flex items-center gap-2 px-4 pt-2.5 pb-2">
          <h2 className="text-label">Tasks</h2>
          <span className="text-caption ml-auto">tap = set now</span>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-2">
          {tasks.length === 0 ? (
            <li className="text-caption px-3 py-6 text-center">No tasks yet — add one below.</li>
          ) : (
            tasks.map((task) => (
              <SheetRow
                key={task.id}
                task={task}
                onTick={() => onTick(task.id)}
                onSetActive={() => onSetActive(task.id)}
                onClear={onClear}
                onRename={(title) => onRename(task.id, title)}
                onRemove={() => onRemove(task.id)}
              />
            ))
          )}
        </ul>

        <div className="px-4 pt-3">
          <form onSubmit={submit} className="flex items-center gap-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Plan the next step…"
              aria-label="New task"
              maxLength={80}
              className="h-9 flex-1 rounded-lg border-white/[0.08] bg-white/[0.04]"
            />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-lg">
              <Plus className="h-4 w-4" aria-hidden />
            </Button>
          </form>

          <button
            type="button"
            onClick={onToggleTracking}
            className={cn(
              'mt-3 w-full cursor-pointer rounded-xl border py-2.5 text-sm transition-colors',
              live
                ? 'border-destructive/30 bg-destructive-tint text-destructive'
                : 'border-primary/35 bg-primary-tint text-primary'
            )}
          >
            {live ? 'Stop tracking' : 'Start tracking'}
          </button>
        </div>
      </div>
    </>
  )
}

function SheetRow({
  task,
  onTick,
  onSetActive,
  onClear,
  onRename,
  onRemove,
}: {
  task: DockTask
  onTick: () => void
  onSetActive: () => void
  onClear: () => void
  onRename: (title: string) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.txt)

  const startEditing = () => {
    setDraft(task.txt)
    setEditing(true)
  }

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== task.txt) onRename(trimmed)
    setEditing(false)
  }

  return (
    <li
      className={cn(
        'flex items-start gap-2 rounded-lg px-2 py-2.5 transition-colors',
        task.active && 'bg-primary/[0.06]'
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
              setDraft(task.txt)
              setEditing(false)
            }
          }}
          aria-label="Task title"
          className="h-[38px] w-full rounded-lg border border-input bg-background/60 px-2.5 text-sm text-foreground focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      ) : (
        <>
          <Checkbox checked={!!task.done} onCheckedChange={onTick} className="mt-0.5" />
          <button
            type="button"
            onClick={onSetActive}
            disabled={task.done}
            className="min-w-0 flex-1 cursor-pointer text-left text-sm leading-5 disabled:cursor-default"
          >
            <span
              className={cn(task.done ? 'text-subtle-foreground line-through' : 'text-foreground')}
            >
              {task.active && (
                <span className="bg-primary-tint text-primary mr-1.5 rounded px-1 py-0.5 align-[1px] font-mono text-label">
                  NOW
                </span>
              )}
              {task.txt}
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-0.5">
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
            <button
              type="button"
              onClick={onRemove}
              aria-label="Delete task"
              className="text-muted-foreground hover:text-foreground flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={startEditing}
              aria-label="Rename task"
              className="text-muted-foreground hover:text-foreground flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </>
      )}
    </li>
  )
}
