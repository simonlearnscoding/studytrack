import type { DashboardSession } from '@studytrack/backend/convex/sessions/types'
import { formatDuration, partialDurationMs } from '@studytrack/backend/convex/sessions/util'
import { cn } from '~/lib/utils'
import { MODE_BAR, MODE_LABEL } from './mode-colors'

const DAY_MS = 24 * 60 * 60 * 1000

// Two visible segments read as one continuous bar when the next starts within a
// second of where the previous ended. The bot closes and opens partials with the
// same `now` (bot/voiceStrategies.ts), so the real gap is zero; the tolerance only
// absorbs rounding.
const TOUCH_TOLERANCE_MS = 1000

type Segment = { start: number; end: number }
type SegmentEnds = { roundLeft: boolean; roundRight: boolean }

// The whole shared day as a fixed axis (midnight to midnight, server timezone) so
// every member's bar lines up and its position reads as a real time of day. Faint
// six-hour lines give the eye a scale; a marker shows how far into the day we are.
export function MemberTimeline({
  sessions,
  dayStart,
  now,
}: {
  sessions: DashboardSession[]
  dayStart: number
  now: number
}) {
  const partials = sessions
    .flatMap((session) => session.partials)
    .sort((a, b) => a.startedAt - b.startedAt)
  const dayEnd = dayStart + DAY_MS
  const nowPct = clamp01((now - dayStart) / DAY_MS) * 100

  // Pause partials are skipped so they read as gaps; each remaining partial is
  // clipped to the day, then rounded only where study actually starts or stops.
  const segments = partials
    .filter((partial) => partial.mode !== 'break')
    .flatMap((partial) => {
      const duration = partialDurationMs(partial, now)
      const start = Math.max(partial.startedAt, dayStart)
      const end = Math.min(partial.startedAt + duration, dayEnd)
      if (end <= start) return []
      return [{ ...partial, duration, start, end }]
    })
  const ends = segmentEnds(segments)

  return (
    <div
      className="relative h-3.5 w-full overflow-hidden rounded-full bg-secondary/80 ring-1 ring-inset ring-white/5"
      role="img"
      aria-label="Study timeline for today"
    >
      {[25, 50, 75].map((pct) => (
        <div
          key={pct}
          className="absolute inset-y-0 w-px bg-foreground/10"
          style={{ left: `${pct}%` }}
          aria-hidden
        />
      ))}

      {segments.map((segment, index) => {
        const { roundLeft, roundRight } = ends[index]
        return (
          <div
            key={segment.id}
            title={`${MODE_LABEL[segment.mode]} · ${formatDuration(segment.duration)}`}
            className={cn(
              'absolute inset-y-[2px] min-w-[4px]',
              roundLeft && 'rounded-l-full',
              roundRight && 'rounded-r-full',
              MODE_BAR[segment.mode]
            )}
            style={{
              left: `${((segment.start - dayStart) / DAY_MS) * 100}%`,
              width: `${((segment.end - segment.start) / DAY_MS) * 100}%`,
            }}
          />
        )
      })}

      <div
        className="absolute inset-y-0 w-px bg-foreground/60"
        style={{ left: `${nowPct}%` }}
        aria-hidden
      />
    </div>
  )
}

// For each already-sorted, Pause-filtered, day-clipped segment, decide which ends
// are free. A left end is free unless the previous segment ends where this one
// starts; a right end is free unless the next segment starts where this one ends.
function segmentEnds(segments: Segment[]): SegmentEnds[] {
  return segments.map((segment, index) => {
    const previous = segments[index - 1]
    const next = segments[index + 1]
    return {
      roundLeft: !(previous && segment.start - previous.end <= TOUCH_TOLERANCE_MS),
      roundRight: !(next && next.start - segment.end <= TOUCH_TOLERANCE_MS),
    }
  })
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}
