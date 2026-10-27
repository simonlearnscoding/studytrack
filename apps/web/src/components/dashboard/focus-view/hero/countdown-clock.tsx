import type { CountdownTone, PlanCountdown } from '@studytrack/backend/convex/planBlocks/util'
import { DASHBOARD_TIME_ZONE } from '@studytrack/backend/convex/workSessions/util'

// The header's left slot. It reports the plan block, not the session: a
// workSession has no planned end, so the only end time that exists is the
// block's (see planCountdown).
//
// The number stays the reading colour in every state. Only the ring escalates:
// emerald is the system's "live", and bronze is the one soft step below it, so
// an almost-over block never borrows the destructive red the Stop action owns.

const RING_TEXT: Record<CountdownTone, string> = {
  normal: 'text-primary',
  low: 'text-bronze',
}

const CLOCK_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: DASHBOARD_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function CountdownClock({ countdown }: { countdown: PlanCountdown }) {
  if (countdown.kind === 'none') return null

  if (countdown.kind === 'upcoming') {
    // A next block is a time of day, not a duration: "starts at 16:40" is what a
    // member plans around. Nothing is draining yet, so there is no ring.
    return (
      <div className="shrink-0 whitespace-nowrap">
        <p className="text-label">Next block · in {totalMinutes(countdown.untilMs)}m</p>
        <div className="mt-1.5 font-mono text-clock font-medium text-foreground">
          {CLOCK_TIME.format(countdown.startsAt)}
        </div>
      </div>
    )
  }

  return (
    <div className="shrink-0 whitespace-nowrap">
      <p className="text-label">Time left</p>
      {/* contract: single clock, minute resolution — everyone ticks per minute */}
      <div className="mt-1.5">
        <CountdownDial drained={countdown.drained} tone={countdown.tone}>
          {totalMinutes(countdown.leftMs)}
        </CountdownDial>
      </div>
    </div>
  )
}

// A dial that empties as the block drains, with the minutes it has left inside
// it, so the slot reads as one object rather than a dial beside a number.
//
// It is drawn from `drained` alone: the minute tick from useNow moves it once a
// minute and the CSS transition carries the eye between ticks. A faster clock
// would buy nothing here and would break the one-clock contract.
function CountdownDial({
  drained,
  tone,
  children,
}: {
  drained: number
  tone: CountdownTone
  children: React.ReactNode
}) {
  const radius = 16
  const circumference = 2 * Math.PI * radius

  return (
    <div className="relative h-18 w-18">
      <svg aria-hidden="true" viewBox="0 0 40 40" className="h-full w-full -rotate-90">
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          strokeWidth="2.5"
          stroke="currentColor"
          className="text-border-strong"
        />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          stroke="currentColor"
          className={`${RING_TEXT[tone]} transition-[stroke-dashoffset] duration-1000 ease-linear`}
          style={{ strokeDasharray: circumference, strokeDashoffset: circumference * drained }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-title font-medium text-foreground">
        {children}
      </span>
    </div>
  )
}

// Minutes, rounded up so a slot never reads 0 while it is still counting. Bare
// for the dial — the label above already says these are minutes.
function totalMinutes(ms: number) {
  return Math.max(1, Math.ceil(ms / 60_000))
}
