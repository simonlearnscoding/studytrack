import type { TaskPlacement } from '@studytrack/backend/convex/tasks/types'
import { CalendarClock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { TaskComposerHint } from '~/components/dashboard/focus-view/tasks/task-composer-hint'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Input } from '~/components/ui/input'
import { useDoneFold } from '~/preferences/use-done-fold'
import { handleComposerKeyDown, useTaskComposerHotkey } from '../hooks/use-task-composer-hotkey'
import { cn } from '~/lib/utils'
import { TaskAction } from '../task-action'
import { TaskGroup } from '../task-group'
import type { TaskId } from '../task-types'
import type { DockTask } from './types'

// The expandable half of the dock: a bottom sheet holding the full task list,
// the composer, and the tracking toggle. Slides up over a scrim; the bar stays
// put underneath, so "now" never leaves the screen.
export function TaskSheet({
  open,
  isManualTracking,
  canStartManual,
  loading,
  openTasks,
  doneTasks,
  nowId,
  dayLabel,
  onClose,
  onAdd,
  onTick,
  onRename,
  onRemove,
  onToggleTracking,
}: {
  open: boolean
  isManualTracking: boolean
  canStartManual: boolean
  loading: boolean
  openTasks: DockTask[]
  doneTasks: DockTask[]
  nowId: TaskId | null
  dayLabel: string
  onClose: () => void
  onAdd: (title: string, placement: TaskPlacement) => void
  onTick: (id: TaskId) => void
  onRename: (id: TaskId, title: string) => void
  onRemove: (id: TaskId) => void
  onToggleTracking: () => void
}) {
  const [title, setTitle] = useState('')
  const [isDoneFolded, setDoneFolded] = useDoneFold()
  const inputRef = useRef<HTMLInputElement>(null)
  useTaskComposerHotkey(inputRef, open)
  const isDoneExpanded = !isDoneFolded
  const isDoneResolved = isDoneFolded !== undefined

  const add = (placement: TaskPlacement) => {
    const trimmed = title.trim()
    if (!trimmed) return
    setTitle('')
    onAdd(trimmed, placement)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    add('end')
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

        <div className="flex items-center justify-between gap-2 px-4 pt-2.5 pb-2">
          <h2 className="text-label">Tasks</h2>
          <span className="text-caption text-subtle-foreground">{dayLabel}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2">
          {loading ? (
            <div className="px-3 py-2">
              <div className="skeleton h-9 rounded-lg" />
            </div>
          ) : openTasks.length === 0 && doneTasks.length === 0 ? (
            <p className="text-caption px-3 py-6 text-center">
              No tasks planned for this day — add one below.
            </p>
          ) : (
            <>
              <ul>
                {openTasks.map((task) => (
                  <SheetRow
                    key={task.id}
                    task={task}
                    isNow={task.id === nowId}
                    onTick={() => onTick(task.id)}
                    onRename={(title) => onRename(task.id, title)}
                    onRemove={() => onRemove(task.id)}
                  />
                ))}
              </ul>

              {doneTasks.length > 0 ? (
                <TaskGroup
                  label="Done"
                  count={doneTasks.length}
                  isExpanded={isDoneExpanded}
                  onToggle={() => setDoneFolded(isDoneExpanded)}
                >
                  {isDoneResolved ? (
                    doneTasks.map((task) => (
                      <SheetRow
                        key={task.id}
                        task={task}
                        isNow={false}
                        onTick={() => onTick(task.id)}
                        onRename={(title) => onRename(task.id, title)}
                        onRemove={() => onRemove(task.id)}
                      />
                    ))
                  ) : (
                    <li className="px-2 py-2">
                      <div className="skeleton h-9 rounded-lg" />
                    </li>
                  )}
                </TaskGroup>
              ) : null}
            </>
          )}
        </div>

        <div className="px-4 pt-3">
          <form onSubmit={submit} className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Input
                ref={inputRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => handleComposerKeyDown(event, add, () => setTitle(''))}
                placeholder="Add a task…"
                aria-label="New task"
                maxLength={80}
                className="peer h-9 rounded-lg border-white/[0.1] bg-white/[0.06] pr-20 placeholder:text-hint"
              />
              <TaskComposerHint />
            </div>
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-lg">
              <Plus className="h-4 w-4" aria-hidden />
            </Button>
          </form>

          {(isManualTracking || canStartManual) && (
            <button
              type="button"
              onClick={onToggleTracking}
              className={cn(
                'mt-3 w-full cursor-pointer rounded-xl border py-2.5 text-sm transition-colors',
                isManualTracking
                  ? 'border-destructive/30 bg-destructive-tint text-destructive'
                  : 'border-primary/35 bg-primary-tint text-primary'
              )}
            >
              {isManualTracking ? 'Stop tracking' : 'Start tracking'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function SheetRow({
  task,
  isNow,
  onTick,
  onRename,
  onRemove,
}: {
  task: DockTask
  isNow: boolean
  onTick: () => void
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
        isNow && 'bg-primary/[0.06]'
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
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="flex min-w-0 items-start gap-1.5 text-sm leading-5">
            {isNow && (
              <span className="bg-primary-tint text-primary shrink-0 rounded px-1 py-0.5 font-mono text-label">
                NOW
              </span>
            )}
            <span
              className={cn(
                'min-w-0 flex-1 line-clamp-2 break-words',
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
          {task.planLabel && (
            <span className="text-subtle-foreground flex min-w-0 items-center gap-1 text-caption">
              <CalendarClock className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{task.planLabel}</span>
            </span>
          )}
        </div>
      )}

      {!editing && (
        <div className="flex shrink-0 items-center gap-0.5">
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
