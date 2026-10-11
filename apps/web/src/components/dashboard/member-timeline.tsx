import type { DashboardPartial, DashboardSession } from '@studytrack/backend/convex/sessions/types'
import { formatDuration, partialDurationMs } from '@studytrack/backend/convex/sessions/util'
import { cn } from '~/lib/utils'

const DAY_MS = 24 * 60 * 60 * 1000

// One colour per mode for now. The four study modes already fill the slots the
// quality tiers will use when we layer the cam+SS-is-best ranking on top; breaks
// stay invisible so they read as gaps.
const MODE_BAR: Record<DashboardPartial['mode'], string> = {
  cameraAndScreenShare: 'bg-emerald-400',
  screenShare: 'bg-violet-400',
  camera: 'bg-sky-400',
  voice: 'bg-neutral-500',
  break: 'bg-transparent',
}

const MODE_LABEL: Record<DashboardPartial['mode'], string> = {
  cameraAndScreenShare: 'Camera + screen',
  screenShare: 'Screen share',
  camera: 'Camera',
  voice: 'Voice',
  break: 'Break',
}

// The whole shared day as a fixed axis (midnight to midnight, server timezone) so
// every member's bar lines up and short sessions stay comparable. A marker shows
// how far into the day we are.
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
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-neutral-800">
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
            className={cn('absolute inset-y-0', MODE_BAR[partial.mode])}
            style={{
              left: `${((start - dayStart) / DAY_MS) * 100}%`,
              width: `${((end - start) / DAY_MS) * 100}%`,
            }}
          />
        )
      })}
      <div
        className="absolute inset-y-0 w-px bg-neutral-400/70"
        style={{ left: `${nowPct}%` }}
        aria-hidden
      />
    </div>
  )
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}
