import type { Task } from '@studytrack/backend/convex/tasks/types'
import { Check } from 'lucide-react'
import { cn } from '~/lib/utils'

// One task row: the whole row toggles, the checkbox carries the state.
export function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-secondary/70"
      >
        <span
          className={cn(
            'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-colors',
            task.done
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-transparent group-hover:border-muted-foreground/60'
          )}
        >
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
        </span>
        <span
          className={cn(
            'truncate text-sm leading-5',
            task.done ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
        >
          {task.title}
        </span>
      </button>
    </li>
  )
}
