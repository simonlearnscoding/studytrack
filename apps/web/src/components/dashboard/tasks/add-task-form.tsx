import { Plus } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { TaskComposerHint } from '~/components/dashboard/task-composer-hint'
import { Button } from '~/components/ui/button'
import { useTaskComposerHotkey } from '~/hooks/use-task-composer-hotkey'
import { cn } from '~/lib/utils'

// The single add-task entry point, shared by the rail widget (compact icon
// button) and the main board (labelled button).
export function AddTaskForm({
  create,
  compact = false,
}: {
  create: (args: { title: string }) => Promise<unknown>
  compact?: boolean
}) {
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useTaskComposerHotkey(inputRef)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    setTitle('')
    create({ title: trimmed }).catch((error) =>
      console.error('[studytrack] failed to add task', error)
    )
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <input
          ref={inputRef}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder=" "
          aria-label="New task"
          className="peer h-9 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        />
        <TaskComposerHint />
      </div>
      <Button
        type="submit"
        size="sm"
        className={cn('h-9 shrink-0', compact ? 'w-9 px-0' : 'gap-1.5')}
        aria-label={compact ? 'Add task' : undefined}
      >
        <Plus className="h-4 w-4" aria-hidden />
        {!compact && 'Add task'}
      </Button>
    </form>
  )
}
