import { formatForDisplay } from '@tanstack/react-hotkeys'
import { CornerDownLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { NEW_TASK_HOTKEY } from '~/hooks/use-task-composer-hotkey'
import { cn } from '~/lib/utils'

// One keycap shared by every shortcut hint: a raised fill and a bright edge
// against the composer surface.
function Keycap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'text-label flex h-5 items-center justify-center rounded-sm border border-foreground/20 bg-foreground/10 px-1.5 font-mono text-foreground',
        className
      )}
    >
      {children}
    </kbd>
  )
}

function EnterKeycap({ className }: { className?: string }) {
  return (
    <Keycap className={cn('w-5 px-0', className)}>
      <CornerDownLeft className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">Enter</span>
    </Keycap>
  )
}

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
      <Keycap>{modifier}</Keycap>
      <span className="text-caption font-medium">+</span>
      <EnterKeycap />
      <span className="text-caption ml-1 font-medium">Add a task</span>
    </span>
  )
}
