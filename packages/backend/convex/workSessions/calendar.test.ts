import { describe, expect, it } from 'vitest'
import {
  bucketForMs,
  buildMonthGrid,
  buildWeekGrid,
  monthLabel,
  type CalendarDayTotal,
} from './calendar'
import { DASHBOARD_TIME_ZONE, dayOfMonth, nextDayStart, startOfDay } from './util'

const M = 60 * 1000
const H = 60 * 60 * 1000

function dayStart(year: number, month: number, day: number): number {
  return startOfDay(Date.UTC(year, month - 1, day, 12, 0, 0), DASHBOARD_TIME_ZONE)
}

function grid(args: {
  monthStart: number
  focusDayStart?: number
  todayDayStart?: number
  totals?: CalendarDayTotal[]
  metric?: 'focus' | 'total'
}) {
  return buildMonthGrid({
    monthStart: args.monthStart,
    focusDayStart: args.focusDayStart ?? args.monthStart,
    todayDayStart: args.todayDayStart ?? args.monthStart,
    totals: args.totals ?? [],
    metric: args.metric ?? 'focus',
    timeZone: DASHBOARD_TIME_ZONE,
  })
}

describe('bucketForMs', () => {
  it('uses the fixed 0, <30m, <1h30, <3h, 3h+ scale', () => {
    expect(bucketForMs(0)).toBe(0)
    expect(bucketForMs(29 * M + 59 * 1000)).toBe(1)
    expect(bucketForMs(30 * M)).toBe(2)
    expect(bucketForMs(89 * M + 59 * 1000)).toBe(2)
    expect(bucketForMs(90 * M)).toBe(3)
    expect(bucketForMs(179 * M + 59 * 1000)).toBe(3)
    expect(bucketForMs(180 * M)).toBe(4)
  })

  it('treats a negative value as no study', () => {
    expect(bucketForMs(-1)).toBe(0)
  })
})

describe('buildMonthGrid', () => {
  it('is a Monday-first 42-cell grid with the right leading blanks', () => {
    const monthStart = dayStart(2026, 10, 1)
    const cells = grid({ monthStart })
    expect(cells).toHaveLength(42)
    // 1 Oct 2026 is a Thursday, so the grid opens on Monday 28 September.
    expect(dayOfMonth(cells[0].dayStart, DASHBOARD_TIME_ZONE)).toBe(28)
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(31)
    expect(cells[0].inMonth).toBe(false)
    expect(cells[3].inMonth).toBe(true)
    expect(cells[3].dayOfMonth).toBe(1)
    expect(cells[33].dayOfMonth).toBe(31)
    expect(cells[34].inMonth).toBe(false)
  })

  it('advances every cell by one calendar day, including across DST', () => {
    const cells = grid({ monthStart: dayStart(2026, 3, 1) })
    for (let i = 1; i < cells.length; i++) {
      expect(cells[i].dayStart).toBe(nextDayStart(cells[i - 1].dayStart, DASHBOARD_TIME_ZONE))
    }
  })

  it('handles February, a leap February and a 30-day month', () => {
    const february = grid({ monthStart: dayStart(2026, 2, 1) })
    const leapFebruary = grid({ monthStart: dayStart(2024, 2, 1) })
    const april = grid({ monthStart: dayStart(2026, 4, 1) })
    expect(february.filter((cell) => cell.inMonth)).toHaveLength(28)
    expect(leapFebruary.filter((cell) => cell.inMonth)).toHaveLength(29)
    expect(april.filter((cell) => cell.inMonth)).toHaveLength(30)
  })

  it('marks Focus, today and future against the grid', () => {
    const monthStart = dayStart(2026, 10, 1)
    const cells = grid({
      monthStart,
      focusDayStart: dayStart(2026, 10, 10),
      todayDayStart: dayStart(2026, 10, 20),
    })
    const inMonth = cells.filter((cell) => cell.inMonth)
    const byDay = new Map(inMonth.map((cell) => [cell.dayOfMonth, cell]))
    expect(byDay.get(10)?.isFocus).toBe(true)
    expect(byDay.get(20)?.isToday).toBe(true)
    expect(byDay.get(19)?.isFuture).toBe(false)
    expect(byDay.get(21)?.isFuture).toBe(true)
  })

  it('leaves missing Daily totals neutral and future days unheated', () => {
    const monthStart = dayStart(2026, 10, 1)
    const totals: CalendarDayTotal[] = [
      { dayStart: dayStart(2026, 10, 2), deepFocusMs: 2 * H, totalMs: 2 * H },
      { dayStart: dayStart(2026, 10, 25), deepFocusMs: 2 * H, totalMs: 2 * H },
    ]
    const cells = grid({
      monthStart,
      todayDayStart: dayStart(2026, 10, 20),
      totals,
    })
    const inMonth = cells.filter((cell) => cell.inMonth)
    const byDay = new Map(inMonth.map((cell) => [cell.dayOfMonth, cell]))
    expect(byDay.get(1)?.bucket).toBe(0)
    expect(byDay.get(2)?.bucket).toBe(3)
    expect(byDay.get(25)?.bucket).toBe(0)
    expect(byDay.get(25)?.isFuture).toBe(true)
  })

  it('uses the selected metric, with the same buckets for both', () => {
    const monthStart = dayStart(2026, 10, 1)
    const totals: CalendarDayTotal[] = [
      { dayStart: dayStart(2026, 10, 2), deepFocusMs: 20 * M, totalMs: 4 * H },
    ]
    const todayDayStart = dayStart(2026, 10, 20)
    const focus = grid({ monthStart, todayDayStart, totals, metric: 'focus' })
    const total = grid({ monthStart, todayDayStart, totals, metric: 'total' })
    expect(focus.find((cell) => cell.dayOfMonth === 2)?.bucket).toBe(1)
    expect(total.find((cell) => cell.dayOfMonth === 2)?.bucket).toBe(4)
  })
})

describe('buildWeekGrid', () => {
  it('is the seven Days from Monday through Sunday, even across a month boundary', () => {
    const weekStart = dayStart(2026, 10, 26)
    const cells = buildWeekGrid({
      weekStart,
      focusDayStart: dayStart(2026, 10, 28),
      todayDayStart: dayStart(2026, 10, 20),
      totals: [],
      metric: 'focus',
      timeZone: DASHBOARD_TIME_ZONE,
    })

    expect(cells).toHaveLength(7)
    expect(cells.map((cell) => cell.dayOfMonth)).toEqual([26, 27, 28, 29, 30, 31, 1])
    expect(cells[2].isFocus).toBe(true)
    expect(cells.every((cell) => cell.inMonth)).toBe(true)
  })

  it('keeps the metric buckets and leaves future Days unheated', () => {
    const weekStart = dayStart(2026, 10, 19)
    const totals: CalendarDayTotal[] = [
      { dayStart: dayStart(2026, 10, 20), deepFocusMs: 20 * M, totalMs: 4 * H },
      { dayStart: dayStart(2026, 10, 25), deepFocusMs: 4 * H, totalMs: 4 * H },
    ]
    const cells = buildWeekGrid({
      weekStart,
      focusDayStart: weekStart,
      todayDayStart: dayStart(2026, 10, 21),
      totals,
      metric: 'focus',
      timeZone: DASHBOARD_TIME_ZONE,
    })

    expect(cells[1].bucket).toBe(1)
    expect(cells[6].bucket).toBe(0)
    expect(cells[6].isFuture).toBe(true)
  })
})

describe('monthLabel', () => {
  it('is the Focus month and year', () => {
    expect(monthLabel(dayStart(2026, 10, 1), DASHBOARD_TIME_ZONE)).toBe('October 2026')
  })
})
