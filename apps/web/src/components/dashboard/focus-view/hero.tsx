import { Play } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import type { QueueTask } from './tasks/task-types'

const heroIdle = { together: 5, openedAt: '12:16', streak: '6d' }

// The workSession header. Its task area mirrors the queue's Now task — the first
// open task of the Day. Read-only — the pane and the mobile dock are where you
// complete and clear.
export function Hero({
  isOnline,
  canStartManual,
  onStartManual,
  elapsedMs,
  nowTask,
  onToggleNowTask,
}: {
  isOnline: boolean
  canStartManual: boolean
  onStartManual: () => void
  elapsedMs: number
  nowTask: QueueTask | null
  onToggleNowTask: () => void
}) {
  if (isOnline) {
    const elapsedMinutes = Math.floor(elapsedMs / 60_000)
    const hours = Math.floor(elapsedMinutes / 60)
    const minutes = String(elapsedMinutes % 60).padStart(2, '0')

    return (
      <section className="flex shrink-0 items-center gap-6 max-lg:flex-col max-lg:items-start max-lg:gap-4 lg:sticky lg:top-0 lg:z-10 lg:min-h-19 lg:bg-background/80 lg:backdrop-blur">
        <div className="shrink-0 whitespace-nowrap">
          {/* contract: single clock, minute resolution — everyone ticks per minute */}
          <div className="font-mono text-clock font-medium">
            {hours}
            <span className="text-subtle-foreground text-[0.62em]">h </span>
            {minutes}
            <span className="text-subtle-foreground text-[0.62em]">m</span>
          </div>
          <p className="text-subtle-foreground mt-1 text-xs">your work session</p>
        </div>

        {/* Now is the topmost open task, promoted to the hero so the room can see
            what you're on. desktop only — on mobile the sticky bottom bar already
            carries it. */}
        <div className="flex min-w-0 items-center gap-3 self-stretch border-l border-primary/25 pl-6 max-lg:hidden">
          {nowTask && (
            <>
              <Checkbox
                checked={false}
                onCheckedChange={onToggleNowTask}
                className="h-7 w-7 shrink-0 rounded-lg border-primary/35"
              />
              <p className="from-foreground to-foreground/60 line-clamp-2 break-words bg-linear-to-b bg-clip-text text-transparent text-display min-w-0">
                {nowTask.title}
              </p>
            </>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="flex items-center gap-4">
      <Button
        className="border-primary/35 bg-primary-tint text-primary hover:bg-primary/[0.22] gap-2 rounded-xl font-semibold"
        disabled={!canStartManual}
        onClick={onStartManual}
      >
        <Play className="h-3.5 w-3.5 fill-current" /> Start tracking
      </Button>
      <p className="text-muted-foreground text-xs">
        <b className="text-foreground font-medium">{heroIdle.together} studying together</b> · room
        opened {heroIdle.openedAt} · {heroIdle.streak} streak on the line
      </p>
    </section>
  )
}
