import { CalendarClock, Pencil, Trash2 } from 'lucide-react'
import { Checkbox } from '~/components/ui/checkbox'
import { cn } from '~/lib/utils'
import { TaskAction } from '../task-action'
import type { QueueTask } from '../task-types'

export function TaskRow({
  task,
  isNow,
  editing,
  draft,
  onDraft,
  onCommit,
  onCancel,
  onStartEditing,
  onTick,
  onRemove,
  overlay = false,
}: {
  task: QueueTask
  isNow?: boolean
  editing: boolean
  draft: string
  onDraft: (value: string) => void
  onCommit: () => void
  onCancel: () => void
  onStartEditing: () => void
  onTick: () => void
  onRemove: () => void
  overlay?: boolean
}) {
  return (
    <>
      <Checkbox
        checked={task.done}
        onCheckedChange={onTick}
        onPointerDown={stopPropagation}
        onKeyDown={stopPropagation}
        tabIndex={overlay ? -1 : undefined}
      />

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => onDraft(event.target.value)}
          onBlur={onCommit}
          onKeyDown={(event) => {
            stopPropagation(event)
            if (event.key === 'Enter') {
              event.preventDefault()
              onCommit()
            } else if (event.key === 'Escape') {
              onCancel()
            }
          }}
          aria-label="Task title"
          className="h-[34px] min-w-0 flex-1 rounded-lg border border-input bg-background/60 px-2.5 text-sm text-foreground focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="flex min-w-0 items-start gap-1.5 text-sm leading-normal">
            <span
              className={cn(
                'min-w-0 flex-1 line-clamp-2 break-words',
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
          {(isNow || task.planLabel) && (
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              {isNow && (
                <span className="text-primary text-label flex items-center gap-1.5">
                  <span className="bg-primary size-1 rounded-full" aria-hidden />
                  Now
                </span>
              )}
              {task.planLabel && (
                <span className="text-subtle-foreground flex min-w-0 items-center gap-1 text-caption">
                  <CalendarClock className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{task.planLabel}</span>
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {!editing && (
        <div
          onPointerDown={stopPropagation}
          onKeyDown={stopPropagation}
          className={cn(
            'flex items-center gap-0.5 transition-opacity duration-150 [&>button]:transition-opacity',
            overlay
              ? 'opacity-100'
              : 'pointer-events-none absolute top-1 right-1 z-10 opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:[&>button]:opacity-60 [&>button:hover]:opacity-100'
          )}
        >
          <TaskAction label="Rename task" onClick={onStartEditing}>
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </TaskAction>
          <TaskAction label="Delete task" onClick={onRemove} danger>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </TaskAction>
        </div>
      )}
    </>
  )
}

function stopPropagation(event: { stopPropagation: () => void }) {
  event.stopPropagation()
}
