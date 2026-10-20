import { formatForDisplay } from '@tanstack/react-hotkeys'
import { CornerDownLeft } from 'lucide-react'
import { NEW_TASK_HOTKEY } from '~/hooks/use-task-composer-hotkey'
import { cn } from '~/lib/utils'

// Sits over an empty composer input as a rich placeholder. Uses the `peer`
// input's `:placeholder-shown` to stay out of the way once the user types, and
// fades while focused so the caret is never covered.
export function TaskComposerHint({ className }: { className?: string }) {
  const [modifier] = formatForDisplay(NEW_TASK_HOTKEY, { parts: true })

  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-y-0 left-3 hidden items-center gap-1 peer-placeholder-shown:flex peer-focus:opacity-0',
        className
      )}
    >
      <kbd className="text-label flex h-5 items-center rounded-sm border border-border bg-secondary px-1.5 font-mono">
        {modifier}
      </kbd>
      <span className="text-caption">+</span>
      <kbd className="flex h-5 w-5 items-center justify-center rounded-sm border border-border bg-secondary text-muted-foreground">
        <CornerDownLeft className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">Enter</span>
      </kbd>
      <span className="text-hint ml-1 text-xs">Add a task</span>
    </span>
  )
}
