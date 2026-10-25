import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/workSessions/util'
import { useEffect, useState } from 'react'
import { useDevClockOffset } from '~/dev-clock/use-dev-clock'

const DAY_MS = 24 * 60 * 60 * 1000

// The start of the dashboard's shared calendar day. It is recomputed at the next
// midnight so the board rolls over without a reload. Stable for the whole day, so
// the Convex query it feeds does not re-subscribe on every render. The dev clock
// moves the day break itself, not just the display.
export function useDayStart(): number {
  const offsetMs = useDevClockOffset()
  const [dayStart, setDayStart] = useState(() =>
    startOfDay(Date.now() + offsetMs, DASHBOARD_TIME_ZONE)
  )

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const fakeNow = () => Date.now() + offsetMs
    const moveToToday = () => setDayStart(startOfDay(fakeNow(), DASHBOARD_TIME_ZONE))

    const scheduleNextRollover = () => {
      const next = startOfDay(fakeNow(), DASHBOARD_TIME_ZONE) + DAY_MS
      timer = setTimeout(
        () => {
          moveToToday()
          scheduleNextRollover()
        },
        Math.max(1000, next - fakeNow())
      )
    }

    moveToToday()
    scheduleNextRollover()
    return () => clearTimeout(timer)
  }, [offsetMs])

  return dayStart
}
