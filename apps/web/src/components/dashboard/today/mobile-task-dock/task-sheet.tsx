import { Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'
import { TaskAction } from '../task-action'
import type { TaskId } from '../task-types'
import type { DockTask } from './types'

// The expandable half of the dock: a bottom sheet holding the full task list,
// the composer, and the tracking toggle. Slides up over a scrim; the bar stays
// put underneath, so "now" never leaves the screen.
export function TaskSheet({
  open,
  live,
  loading,
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
  loading: boolean
  tasks: DockTask[]
  onClose: () => void
  onAdd: (title: string) => void
  onTick: (id: TaskId) => void
  onSetActive: (id: TaskId) => void
  onClear: () => void
  onRename: (id: TaskId, title: string) => void
  onRemove: (id: TaskId) => void
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
          <span className="text-caption ml-auto">play = now</span>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-2">
          {loading ? (
            <li className="px-3 py-2">
              <div className="skeleton h-9 rounded-lg" />
            </li>
          ) : tasks.length === 0 ? (
            <li className="text-caption px-3 py-6 text-center">
              No tasks planned for this day — add one below.
            </li>
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
    <li
      className={cn(
        'flex items-center gap-2 rounded-lg px-2 py-2.5 transition-colors',
        task.active && 'bg-primary/[0.06]'
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
        <p className="flex min-w-0 flex-1 items-center gap-1.5 text-sm leading-5">
          {task.active && (
            <span className="bg-primary-tint text-primary shrink-0 rounded px-1 py-0.5 font-mono text-label">
              NOW
            </span>
          )}
          <span
            className={cn(
              'min-w-0 truncate',
              task.done ? 'text-subtle-foreground line-through' : 'text-foreground'
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
          <TaskAction label="Delete task" onClick={onRemove} danger>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </TaskAction>
        </div>
      )}
    </li>
  )
}
