import { Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { Checkbox } from '~/components/ui/checkbox'
import { cn } from '~/lib/utils'
import { TaskAction } from '../task-action'
import type { QueueTask } from '../task-types'

export function TaskRow({
  task,
  isNext,
  editing,
  draft,
  onDraft,
  onCommit,
  onCancel,
  onStartEditing,
  onTick,
  onSetActive,
  onClear,
  onRemove,
  overlay = false,
}: {
  task: QueueTask
  isNext?: boolean
  editing: boolean
  draft: string
  onDraft: (value: string) => void
  onCommit: () => void
  onCancel: () => void
  onStartEditing: () => void
  onTick: () => void
  onSetActive: () => void
  onClear: () => void
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
          <p className="flex min-w-0 items-center gap-1.5 text-sm leading-normal">
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
          {task.active && (
            <span className="bg-primary-tint text-primary text-label flex w-max items-center gap-1 rounded px-1 py-0.5 font-mono">
              <span className="bg-primary h-1 w-1 rounded-full" />
              NOW
            </span>
          )}
          {!task.active && !task.done && isNext && (
            <span className="text-label border-border text-muted-foreground flex w-max items-center gap-1 rounded border px-1 py-0.5 font-mono">
              <span className="bg-primary h-1 w-1 rounded-full" />
              NEXT
            </span>
          )}
        </div>
      )}

      {!editing && (
        <div
          onPointerDown={stopPropagation}
          onKeyDown={stopPropagation}
          className={cn(
            'flex shrink-0 items-center gap-0.5 transition-opacity duration-150',
            overlay
              ? 'opacity-100'
              : 'pointer-events-none opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100'
          )}
        >
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
