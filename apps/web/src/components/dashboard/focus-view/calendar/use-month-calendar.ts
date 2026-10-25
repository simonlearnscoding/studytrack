import { api } from '@studytrack/backend/convex/_generated/api'
import type { DailyTotalCalendar } from '@studytrack/backend/convex/dailyTotals/types'
import {
  buildMonthGrid,
  buildWeekGrid,
  monthLabel,
  type CalendarDayTotal,
  type MonthCell,
} from '@studytrack/backend/convex/workSessions/calendar'
import {
  DASHBOARD_TIME_ZONE,
  elapsedSince,
  nextMonthStart,
  nextWeekStart,
  shiftMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '@studytrack/backend/convex/workSessions/util'
import { useQuery } from 'convex/react'
import { useLastDefined } from '~/hooks/use-last-defined'
import { useDateStore } from '~/state/date.store'
import { useMetric } from '~/preferences/use-metric'

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000

// The calendar's view: the Focus month and week as labels and cells, plus the
// actions the card exposes. It owns the Focus period (via the shared date store),
// the private Daily totals reads and the site metric mapping; the grid maths is
// the pure helper in the backend's shared date module.
export type MonthCalendarView = {
  monthLabel: string
  weekLabel: string
  monthCells: MonthCell[]
  weekCells: MonthCell[]
  selectDay: (dayStart: number) => void
  previousMonth: () => void
  nextMonth: () => void
  previousWeek: () => void
  nextWeek: () => void
  showFocusWeek: () => void
  showWeekMonth: () => void
}

export function useMonthCalendar(now: number): MonthCalendarView {
  const selectedDate = useDateStore((state) => state.selectedDate)
  const selectDate = useDateStore((state) => state.selectDate)
  const monthStart = useDateStore((state) => state.viewedMonthStart)
  const weekStart = useDateStore((state) => state.viewedWeekStart)
  const showMonth = useDateStore((state) => state.showMonth)
  const showWeek = useDateStore((state) => state.showWeek)
  const metric = useMetric()

  // Normalise the client Date to the shared Europe/Zurich Day start rather than
  // trusting the browser's own midnight. The Focus day only marks the ring; the
  // grid and the read follow independently paged periods.
  const focusDayStart = startOfDay(selectedDate.getTime(), DASHBOARD_TIME_ZONE)
  const todayDayStart = startOfDay(now, DASHBOARD_TIME_ZONE)
  const monthEnd = nextMonthStart(monthStart, DASHBOARD_TIME_ZONE)
  const weekEnd = nextWeekStart(weekStart, DASHBOARD_TIME_ZONE)

  // Stable Day starts, so the minute tick never replaces the query. The last
  // good read survives a key change to keep the grid from blanking.
  const monthCalendar = useLastDefined(
    useQuery(api.dailyTotals.getCalendar, {
      fromDayStart: monthStart,
      toDayStart: monthEnd,
      todayStart: todayDayStart,
    })
  )
  // The week card usually sits inside the viewed month, so its seven Days are
  // already in the month read. Only page a separate week when the two ranges
  // have drifted apart; the grid ignores totals outside its seven Days.
  const weekInsideMonth = weekStart >= monthStart && weekEnd <= monthEnd
  const weekCalendar = useLastDefined(
    useQuery(
      api.dailyTotals.getCalendar,
      weekInsideMonth
        ? 'skip'
        : {
            fromDayStart: weekStart,
            toDayStart: weekEnd,
            todayStart: todayDayStart,
          }
    )
  )
  const monthTotals = withLiveToday(monthCalendar, now)
  const weekTotals = withLiveToday(weekInsideMonth ? monthCalendar : weekCalendar, now)

  return {
    monthLabel: monthLabel(monthStart, DASHBOARD_TIME_ZONE),
    weekLabel: monthLabel(weekStart, DASHBOARD_TIME_ZONE),
    monthCells: buildMonthGrid({
      monthStart,
      focusDayStart,
      todayDayStart,
      totals: monthTotals,
      metric,
      timeZone: DASHBOARD_TIME_ZONE,
    }),
    weekCells: buildWeekGrid({
      weekStart,
      focusDayStart,
      todayDayStart,
      totals: weekTotals,
      metric,
      timeZone: DASHBOARD_TIME_ZONE,
    }),
    selectDay: (dayStart) => selectDate(new Date(dayStart)),
    previousMonth: () => showMonth(shiftMonth(monthStart, -1, DASHBOARD_TIME_ZONE)),
    nextMonth: () => showMonth(shiftMonth(monthStart, 1, DASHBOARD_TIME_ZONE)),
    previousWeek: () => showWeek(startOfWeek(weekStart - TWELVE_HOURS_MS, DASHBOARD_TIME_ZONE)),
    nextWeek: () => showWeek(nextWeekStart(weekStart, DASHBOARD_TIME_ZONE)),
    showFocusWeek: () => showWeek(startOfWeek(focusDayStart, DASHBOARD_TIME_ZONE)),
    showWeekMonth: () => showMonth(startOfMonth(weekStart, DASHBOARD_TIME_ZONE)),
  }
}

// Closed Days are final; today's settled cell gets its still-running minutes
// added from the reader's clock, so the read stays stable for the whole Day.
function withLiveToday(calendar: DailyTotalCalendar | undefined, now: number): CalendarDayTotal[] {
  if (!calendar) return []

  const days = [...calendar.days]
  if (calendar.today) {
    days.push({
      dayStart: calendar.today.dayStart,
      deepFocusMs:
        calendar.today.deepFocusMs + elapsedSince(calendar.today.live.deepFocusSince, now),
      totalMs: calendar.today.totalMs + elapsedSince(calendar.today.live.spanSince, now),
    })
  }
  return days
}
