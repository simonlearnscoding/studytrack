import type { PlanCountdown } from '@studytrack/backend/convex/planBlocks/util'
import type { NowTaskCandidate } from '@studytrack/backend/convex/tasks/types'
import { Square } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'

// The workSession header. Its task area shows the member's Now — today's first
// open task — whatever Day the board is showing. It is absent until the member
// is tracking; starting lives in the room rail's invite card.
//
// The left slot no longer reports elapsed time. A session has no planned end, so
// the only meaningful clock is the plan block's: time left in the block covering
// now, else time until the Day's next block, else no clock at all (see
// planCountdown). On mobile the slot is the whole header, so it goes with it.
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

  const showClock = countdown.kind !== 'none'
  const { hours, minutes } = showClock ? countdownParts(countdown) : { hours: 0, minutes: '00' }

  return (
    <section
      className={`flex shrink-0 items-center gap-5 border-b border-border pb-5 max-lg:flex-col max-lg:items-start max-lg:gap-4 lg:sticky lg:top-0 lg:z-10 lg:min-h-19 lg:bg-background/80 lg:backdrop-blur ${
        showClock ? '' : 'max-lg:hidden'
      }`}
    >
      {showClock && (
        <div className="shrink-0 whitespace-nowrap">
          <p className="text-label">{countdown.kind === 'live' ? 'Time left' : 'Next block in'}</p>
          {/* contract: single clock, minute resolution — everyone ticks per minute */}
          <div className="mt-1.5 flex items-center gap-3">
            {countdown.kind === 'live' && <CountdownDial drained={countdown.drained} />}
            <div className="font-mono text-clock font-medium">
              {hours > 0 && (
                <>
                  {hours}
                  <span className="text-subtle-foreground text-[0.62em]">h </span>
                </>
              )}
              {minutes}
              <span className="text-subtle-foreground text-[0.62em]">m</span>
            </div>
          </div>
        </div>
      )}

      {/* The divider keeps the clock and Now as separate reads: the clock is the
          plan block's, Now is today's top Open task. Now is desktop only — on
          mobile the sticky bottom bar already carries it. */}
      <div className="flex min-w-0 flex-1 items-center gap-5 max-lg:hidden">
        {showClock && <div className="h-12 w-px shrink-0 bg-border" />}

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

// Minutes, rounded up so a slot never reads 0m while it is still counting. The
// hour unit only appears once there is an hour to show: "48m", not "0h 48m".
function countdownParts(countdown: Exclude<PlanCountdown, { kind: 'none' }>) {
  const ms = countdown.kind === 'live' ? countdown.leftMs : countdown.untilMs
  const totalMinutes = Math.max(1, Math.ceil(ms / 60_000))
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: String(totalMinutes % 60).padStart(2, '0'),
  }
}

// A dial that empties as the block drains, so the slot reads as a timer and not
// just a number. It is drawn from `drained` alone: the minute tick from useNow
// moves it once a minute, and the CSS transition carries the eye between ticks.
// A faster clock would buy nothing here and would break the one-clock contract.
// Decorative — the minutes beside it are the fact.
function CountdownDial({ drained }: { drained: number }) {
  const radius = 16
  const circumference = 2 * Math.PI * radius

  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className="h-11 w-11 shrink-0 -rotate-90">
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        strokeWidth="3"
        stroke="currentColor"
        className="text-border-strong"
      />
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        stroke="currentColor"
        className="text-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
        style={{ strokeDasharray: circumference, strokeDashoffset: circumference * drained }}
      />
    </svg>
  )
}
