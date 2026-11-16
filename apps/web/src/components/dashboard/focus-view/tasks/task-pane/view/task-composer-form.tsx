import type { TaskPlacement } from '@studytrack/backend/convex/tasks/types'
import { Plus } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { handleComposerKeyDown, useTaskComposerHotkey } from '../../hooks/use-task-composer-hotkey'
import { TaskComposerHint } from '../../task-composer-hint'

// The pane's "add a task" row. It owns the draft and the New-task hotkey, so the
// pane never holds a text input's state: Enter adds at the bottom, Shift+Enter
// after Now and Mod+Enter at the top (see useTaskComposerHotkey).
export function TaskComposerForm({
  onAdd,
}: {
  onAdd: (title: string, placement: TaskPlacement) => void
}) {
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useTaskComposerHotkey(inputRef)

  const add = (placement: TaskPlacement) => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    setTitle('')
    onAdd(trimmedTitle, placement)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    add('end')
  }

  return (
    <form
      onSubmit={submit}
      className="mb-4 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/[0.045] p-1.5 transition-colors duration-150 hover:border-primary/40 focus-within:border-primary/70 focus-within:bg-primary/[0.07]"
    >
      <Button
        type="submit"
        size="icon"
        aria-label="Create task"
        className="size-9 shrink-0 rounded-lg"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </Button>
      <div className="relative min-w-0 flex-1">
        <Input
          ref={inputRef}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => handleComposerKeyDown(event, add, () => setTitle(''))}
          placeholder="Add a task..."
          aria-label="New task"
          className="peer h-9 border-0 bg-transparent pr-20 pl-2 text-sm placeholder:text-hint focus-visible:ring-0 dark:bg-transparent"
        />
        <TaskComposerHint />
      </div>
    </form>
  )
}
