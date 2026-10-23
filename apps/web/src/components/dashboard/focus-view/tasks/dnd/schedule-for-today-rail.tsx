import { useDroppable } from '@dnd-kit/core'
import { CalendarPlus } from 'lucide-react'
import { cn } from '~/lib/utils'

export const TODAY_DROP_ID = 'schedule-for-today'

// The fixed rail in the gap right of the task pane. It mounts only while a drag
// runs on a past Day, so today and future Days never show it.
export function TodayDropRail() {
  const { setNodeRef, isOver } = useDroppable({ id: TODAY_DROP_ID })

  return (
    <div
      ref={setNodeRef}
      role="region"
      aria-label="Schedule this task for today"
      className={cn(
        'fixed top-1/2 right-3 z-50 flex h-[56vh] w-14 -translate-y-1/2 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-2 text-center backdrop-blur transition-colors',
        isOver
          ? 'border-primary bg-primary/15 text-primary'
          : 'border-border-strong bg-background/80 text-muted-foreground'
      )}
    >
      <CalendarPlus className="h-4 w-4 shrink-0" />
      <span className="text-caption leading-snug [writing-mode:vertical-rl]">
        drag here to schedule for today
      </span>
    </div>
  )
}
