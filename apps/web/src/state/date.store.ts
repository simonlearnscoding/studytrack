import {
  DASHBOARD_TIME_ZONE,
  startOfMonth,
  startOfWeek,
} from '@studytrack/backend/convex/workSessions/util'
import { create } from 'zustand'

/**
 * The date the dashboard is focused on, and the period the calendar is looking at.
 * They are deliberately separate: paging the calendar must not move the board or
 * the task list. Clicking a day changes the Focus day; the calendar arrows change
 * only the viewed week or month. "Today" moves both.
 */
interface DateState {
  selectedDate: Date
  viewedMonthStart: number
  viewedWeekStart: number
  selectDate: (date: Date) => void
  showMonth: (monthStart: number) => void
  showWeek: (weekStart: number) => void
  selectToday: (date: Date) => void
}

export const useDateStore = create<DateState>((set) => ({
  selectedDate: new Date(),
  viewedMonthStart: startOfMonth(Date.now(), DASHBOARD_TIME_ZONE),
  viewedWeekStart: startOfWeek(Date.now(), DASHBOARD_TIME_ZONE),
  selectDate: (date) =>
    set({
      selectedDate: date,
      viewedWeekStart: startOfWeek(date.getTime(), DASHBOARD_TIME_ZONE),
    }),
  showMonth: (monthStart) => set({ viewedMonthStart: monthStart }),
  showWeek: (weekStart) => set({ viewedWeekStart: weekStart }),
  selectToday: (date) =>
    set({
      selectedDate: date,
      viewedMonthStart: startOfMonth(date.getTime(), DASHBOARD_TIME_ZONE),
      viewedWeekStart: startOfWeek(date.getTime(), DASHBOARD_TIME_ZONE),
    }),
}))
