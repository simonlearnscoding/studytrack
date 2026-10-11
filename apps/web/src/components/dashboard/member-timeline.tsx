import type { DashboardSession } from '@studytrack/backend/convex/sessions/types'
import { formatDuration, partialDurationMs } from '@studytrack/backend/convex/sessions/util'
import { cn } from '~/lib/utils'
import { MODE_BAR, MODE_LABEL } from './mode-colors'

const DAY_MS = 24 * 60 * 60 * 1000

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

      {partials.map((partial) => {
        if (partial.mode === 'break') return null

        const duration = partialDurationMs(partial, now)
        const start = Math.max(partial.startedAt, dayStart)
        const end = Math.min(partial.startedAt + duration, dayEnd)
        if (end <= start) return null

        return (
          <div
            key={partial.id}
            title={`${MODE_LABEL[partial.mode]} · ${formatDuration(duration)}`}
            className={cn(
              'absolute inset-y-[2px] min-w-[4px] rounded-full',
              MODE_BAR[partial.mode]
            )}
            style={{
              left: `${((start - dayStart) / DAY_MS) * 100}%`,
              width: `${((end - start) / DAY_MS) * 100}%`,
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

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}
