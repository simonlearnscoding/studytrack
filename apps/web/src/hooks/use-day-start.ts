import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/workSessions/util'
import { useEffect, useState } from 'react'

const DAY_MS = 24 * 60 * 60 * 1000

// The start of the dashboard's shared calendar day. It is recomputed at the next
// midnight so the board rolls over without a reload. Stable for the whole day, so
// the Convex query it feeds does not re-subscribe on every render.
export function useDayStart(): number {
  const [dayStart, setDayStart] = useState(() => startOfDay(Date.now(), DASHBOARD_TIME_ZONE))

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const scheduleNextRollover = () => {
      const next = startOfDay(Date.now(), DASHBOARD_TIME_ZONE) + DAY_MS
      timer = setTimeout(
        () => {
          setDayStart(startOfDay(Date.now(), DASHBOARD_TIME_ZONE))
          scheduleNextRollover()
        },
        Math.max(1000, next - Date.now())
      )
    }

    scheduleNextRollover()
    return () => clearTimeout(timer)
  }, [])

  return dayStart
}
