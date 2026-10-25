import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/workSessions/util'
import { useEffect, useRef } from 'react'
import { Button } from '~/components/ui/button'
import { useNow } from '~/hooks/use-now'
import { useDateStore } from '~/state/date.store'
import { DAY_MS, HOUR_MS, MINUTE_MS, useDevClock } from './use-dev-clock'

const clockFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: DASHBOARD_TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const JUMPS = [
  { label: '−1d', deltaMs: -DAY_MS },
  { label: '−1h', deltaMs: -HOUR_MS },
  { label: '−15m', deltaMs: -15 * MINUTE_MS },
  { label: '+15m', deltaMs: 15 * MINUTE_MS },
  { label: '+1h', deltaMs: HOUR_MS },
  { label: '+1d', deltaMs: DAY_MS },
] as const

// Development only: the deployment decides whether this exists, so production
// renders nothing at all. The fake time shows beside the buttons so no one has to
// guess which clock the board is on.
export function DevClockControl() {
  const clock = useDevClock()
  if (!clock.enabled) return null
  return <EnabledDevClock clock={clock} />
}

function EnabledDevClock({ clock }: { clock: ReturnType<typeof useDevClock> }) {
  const now = useNow(1000)
  const selectToday = useDateStore((state) => state.selectToday)
  const hasSyncedFocusDay = useRef(false)

  // A persisted offset survives reloads, so the board must open on the fake
  // today rather than the real one. Only the first arrival does this; later
  // jumps are explicit.
  useEffect(() => {
    if (hasSyncedFocusDay.current) return
    hasSyncedFocusDay.current = true
    if (clock.offsetMs === 0) return
    selectToday(new Date(startOfDay(Date.now() + clock.offsetMs, DASHBOARD_TIME_ZONE)))
  }, [clock.offsetMs, selectToday])

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-y border-border/60 py-2">
      <span className="text-label text-primary">Dev clock</span>
      <time className="font-mono text-caption text-foreground">{clockFormat.format(now)}</time>
      <span className="text-caption text-muted-foreground">{offsetLabel(clock.offsetMs)}</span>
      <div className="ml-auto flex flex-wrap items-center gap-1">
        {JUMPS.map((jump) => (
          <Button
            key={jump.label}
            type="button"
            variant="ghost"
            size="sm"
            className="text-caption text-muted-foreground hover:text-foreground h-7 px-2 font-mono"
            onClick={() => clock.move(jump.deltaMs)}
          >
            {jump.label}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2.5"
          disabled={clock.offsetMs === 0}
          onClick={clock.reset}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}

function offsetLabel(offsetMs: number): string {
  if (offsetMs === 0) return 'real time'
  const sign = offsetMs < 0 ? '−' : '+'
  const totalMinutes = Math.round(Math.abs(offsetMs) / MINUTE_MS)
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60
  const parts = [days ? `${days}d` : '', hours ? `${hours}h` : '', minutes ? `${minutes}m` : '']
  return `${sign}${parts.filter(Boolean).join(' ')}`
}
