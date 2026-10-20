import { dayOfMonth, nextDayStart, nextMonthStart, startOfWeek } from './util'

// The fixed heat scale for the month calendar (ST-28): 0 = no study, then under
// 30m, 30m–1h30, 1h30–3h and 3h or more. Fixed forever so a colour always means
// the same amount of study, whichever site metric is selected.
export type CalendarBucket = 0 | 1 | 2 | 3 | 4

// One square of the 42-cell grid. Out-of-month cells are blank, but still carry
// their Day start and a zero bucket so the grid keeps a stable height.
export type MonthCell = {
  dayStart: number
  dayOfMonth: number
  inMonth: boolean
  isFocus: boolean
  isToday: boolean
  isFuture: boolean
  bucket: CalendarBucket
}

// One Day of Daily totals, in whichever metric the caller picked.
export type CalendarDayTotal = {
  dayStart: number
  deepFocusMs: number
  totalMs: number
}

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const CELL_COUNT = 42

export function bucketForMs(ms: number): CalendarBucket {
  if (ms <= 0) return 0
  if (ms < 30 * MINUTE_MS) return 1
  if (ms < 90 * MINUTE_MS) return 2
  if (ms < 3 * HOUR_MS) return 3
  return 4
}

// A six-week, Monday-first grid for `monthStart`, with the Focus day's flags and
// the selected metric's heat bucket. Pure: it reads no clock, DB or store.
export function buildMonthGrid(args: {
  monthStart: number
  focusDayStart: number
  todayDayStart: number
  totals: CalendarDayTotal[]
  metric: 'focus' | 'total'
  timeZone: string
}): MonthCell[] {
  const { monthStart, focusDayStart, todayDayStart, totals, metric, timeZone } = args
  const monthEnd = nextMonthStart(monthStart, timeZone)
  const byDay = new Map(totals.map((total) => [total.dayStart, total]))

  const cells: MonthCell[] = []
  let dayStart = startOfWeek(monthStart, timeZone)
  for (let i = 0; i < CELL_COUNT; i++) {
    const inMonth = dayStart >= monthStart && dayStart < monthEnd
    const isFuture = dayStart > todayDayStart
    const total = byDay.get(dayStart)
    const ms = total ? (metric === 'focus' ? total.deepFocusMs : total.totalMs) : 0
    cells.push({
      dayStart,
      dayOfMonth: dayOfMonth(dayStart, timeZone),
      inMonth,
      isFocus: dayStart === focusDayStart,
      isToday: dayStart === todayDayStart,
      isFuture,
      // Future days never claim study that has not happened.
      bucket: inMonth && !isFuture ? bucketForMs(ms) : 0,
    })
    dayStart = nextDayStart(dayStart, timeZone)
  }
  return cells
}

// The card header: the Focus day's Month and year, e.g. `October 2026`.
export function monthLabel(monthStart: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'long',
    year: 'numeric',
  }).format(new Date(monthStart))
}
