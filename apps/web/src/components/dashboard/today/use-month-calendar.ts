import { api } from '@studytrack/backend/convex/_generated/api'
import {
  buildMonthGrid,
  monthLabel,
  type MonthCell,
} from '@studytrack/backend/convex/sessions/calendar'
import {
  DASHBOARD_TIME_ZONE,
  nextMonthStart,
  shiftMonth,
  startOfDay,
  startOfMonth,
} from '@studytrack/backend/convex/sessions/util'
import { useQuery } from 'convex/react'
import { useDateStore } from '~/state/date.store'
import { useMetricStore } from '~/state/metric.store'

// The month card's view: the Focus month's label and 42 cells, plus the three
// actions the card exposes. It owns the Focus month (via the shared date store),
// the private Daily totals read and the site metric mapping; the grid maths is
// the pure helper in the backend's shared date module.
export type MonthCalendarView = {
  label: string
  cells: MonthCell[]
  selectDay: (dayStart: number) => void
  previousMonth: () => void
  nextMonth: () => void
}

export function useMonthCalendar(now: number): MonthCalendarView {
  const selectedDate = useDateStore((state) => state.selectedDate)
  const selectDate = useDateStore((state) => state.selectDate)
  const metric = useMetricStore((state) => state.metric)

  // Normalise the client Date to the shared Europe/Zurich Day start rather than
  // trusting the browser's own midnight.
  const focusDayStart = startOfDay(selectedDate.getTime(), DASHBOARD_TIME_ZONE)
  const monthStart = startOfMonth(focusDayStart, DASHBOARD_TIME_ZONE)
  const monthEnd = nextMonthStart(monthStart, DASHBOARD_TIME_ZONE)
  const todayDayStart = startOfDay(now, DASHBOARD_TIME_ZONE)

  const totals = useQuery(api.dailyTotals.getCalendar, {
    fromDayStart: monthStart,
    toDayStart: monthEnd,
    now,
  })

  return {
    label: monthLabel(monthStart, DASHBOARD_TIME_ZONE),
    cells: buildMonthGrid({
      monthStart,
      focusDayStart,
      todayDayStart,
      totals: totals ?? [],
      metric,
      timeZone: DASHBOARD_TIME_ZONE,
    }),
    selectDay: (dayStart) => selectDate(new Date(dayStart)),
    previousMonth: () => selectDate(new Date(shiftMonth(focusDayStart, -1, DASHBOARD_TIME_ZONE))),
    nextMonth: () => selectDate(new Date(shiftMonth(focusDayStart, 1, DASHBOARD_TIME_ZONE))),
  }
}
