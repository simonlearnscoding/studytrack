import type { PlanCountdown } from '@studytrack/backend/convex/planBlocks/util'
import type { NowTaskCandidate } from '@studytrack/backend/convex/tasks/types'
import { Square } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { CountdownClock } from './countdown-clock'

// The workSession header. Its task area shows the member's Now — today's first
// open task — whatever Day the board is showing. It is absent until the member
// is tracking; starting lives in the room rail's invite card.
//
// The clock slot counts down the plan block, not the session, and disappears
// when the Day has no block to count toward. On mobile the slot is the whole
// header, so the section goes with it.
export function Hero({
  isOnline,
  isManual,
  onStopManual,
  countdown,
  nowTask,
  onToggleNowTask,
}: {
  isOnline: boolean
  isManual: boolean
  onStopManual: () => void
  countdown: PlanCountdown
  nowTask: NowTaskCandidate | null
  onToggleNowTask: () => void
}) {
  if (!isOnline) return null

  const hasClock = countdown.kind !== 'none'

  return (
    <section
      className={`flex shrink-0 items-center gap-5 border-b border-border pb-5 max-lg:flex-col max-lg:items-start max-lg:gap-4 lg:sticky lg:top-0 lg:z-10 lg:min-h-19 lg:bg-background/80 lg:backdrop-blur ${
        hasClock ? '' : 'max-lg:hidden'
      }`}
    >
      <CountdownClock countdown={countdown} />

      {/* The divider keeps the clock and Now as separate reads: the clock is the
          plan block's, Now is today's top Open task. Now is desktop only — on
          mobile the sticky bottom bar already carries it. */}
      <div className="flex min-w-0 flex-1 items-center gap-5 max-lg:hidden">
        {hasClock && <div className="h-12 w-px shrink-0 bg-border" />}

        <div className="min-w-0 flex-1">
          <p className="text-label text-primary">Now</p>
          <div className="mt-1 flex min-w-0 items-start gap-3">
            {nowTask && (
              <Checkbox
                checked={false}
                onCheckedChange={onToggleNowTask}
                className="h-7 w-7 shrink-0 rounded-lg border-primary/35"
              />
            )}
            <p
              className="text-title line-clamp-2 min-w-0 font-medium break-words text-foreground"
              title={nowTask?.title}
            >
              {nowTask?.title ?? 'Nothing queued'}
            </p>
          </div>
        </div>

        {/* Only the manual timer can be stopped here; a Discord workSession is
            closed by the voice events. Mobile stops from the task sheet. */}
        {isManual && (
          <Button
            className="border-destructive/30 bg-destructive-tint text-destructive hover:bg-destructive/[0.22] shrink-0 gap-2 rounded-xl font-semibold"
            onClick={onStopManual}
          >
            <Square className="h-3.5 w-3.5 fill-current" /> Stop tracking
          </Button>
        )}
      </div>
    </section>
  )
}
