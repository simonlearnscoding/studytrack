import {
  DASHBOARD_TIME_ZONE,
  nextMonthStart,
  nextWeekStart,
  previousDayStart,
  shiftMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '@studytrack/backend/convex/sessions/util'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useDateStore } from '~/state/date.store'

export type LeaderboardPeriod = 'week' | 'month'

// The week/month range over the board. A week reads as the compact European
// date range `05.10. - 11.10.`; a month reads as its name, `October`. The arrows
// step the shared Focus day by the period the board is currently ranking on, so
// the range and the rows move together.
const rangeFormat = new Intl.DateTimeFormat('de-DE', {
  timeZone: DASHBOARD_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
})

const monthFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: DASHBOARD_TIME_ZONE,
  month: 'long',
})

const HOUR_MS = 60 * 60 * 1000

export function LeaderboardRange({ period }: { period: LeaderboardPeriod }) {
  const selectedDate = useDateStore((state) => state.selectedDate)
  const selectDate = useDateStore((state) => state.selectDate)
  const dayStart = startOfDay(selectedDate.getTime(), DASHBOARD_TIME_ZONE)
  const { start, end } = periodBounds(dayStart, period)

  return (
    <div className="flex min-w-0 items-center gap-1 pb-2">
      {/* A fixed-width label slot keeps the arrows in the same spot for every
          period, whether the label reads `05.10. - 11.10.` or `October`. A
          long label truncates instead of pushing the arrows around. */}
      <span className="text-label w-28 shrink-0 truncate tracking-[0.18em]">
        {period === 'month'
          ? monthFormat.format(start)
          : `${rangeFormat.format(start)} - ${rangeFormat.format(end)}`}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Previous ${period}`}
          onClick={() => selectDate(new Date(stepFocusDay(dayStart, period, -1)))}
          className="text-subtle-foreground hover:text-foreground h-7 w-7"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Next ${period}`}
          onClick={() => selectDate(new Date(stepFocusDay(dayStart, period, 1)))}
          className="text-subtle-foreground hover:text-foreground h-7 w-7"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// The inclusive first and last Days of the period containing the Focus day.
function periodBounds(dayStart: number, period: LeaderboardPeriod) {
  if (period === 'week') {
    const weekStart = startOfWeek(dayStart, DASHBOARD_TIME_ZONE)
    return {
      start: weekStart,
      end: previousDayStart(nextWeekStart(weekStart, DASHBOARD_TIME_ZONE), DASHBOARD_TIME_ZONE),
    }
  }
  const monthStart = startOfMonth(dayStart, DASHBOARD_TIME_ZONE)
  return {
    start: monthStart,
    end: previousDayStart(nextMonthStart(monthStart, DASHBOARD_TIME_ZONE), DASHBOARD_TIME_ZONE),
  }
}

// Move the Focus day one period in `direction`, keeping its weekday (week) or
// day-of-month (month) whenever the target month allows.
function stepFocusDay(dayStart: number, period: LeaderboardPeriod, direction: -1 | 1): number {
  if (period === 'month') return shiftMonth(dayStart, direction, DASHBOARD_TIME_ZONE)

  const weekStart = startOfWeek(dayStart, DASHBOARD_TIME_ZONE)
  const offset = dayStart - weekStart
  const targetWeek =
    direction < 0
      ? startOfWeek(weekStart - 12 * HOUR_MS, DASHBOARD_TIME_ZONE)
      : nextWeekStart(weekStart, DASHBOARD_TIME_ZONE)
  return startOfDay(targetWeek + offset, DASHBOARD_TIME_ZONE)
}
