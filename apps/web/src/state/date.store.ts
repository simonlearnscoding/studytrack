import { DASHBOARD_TIME_ZONE, startOfMonth } from '@studytrack/backend/convex/sessions/util'
import { create } from 'zustand'

/**
 * The date the dashboard is focused on, and the month the calendar is looking at.
 * They are deliberately separate: paging the calendar must not move the board or
 * the task list. Clicking a day changes the Focus day; the calendar arrows change
 * only the viewed month. "Today" moves both.
 */
interface DateState {
  selectedDate: Date
  viewedMonthStart: number
  selectDate: (date: Date) => void
  showMonth: (monthStart: number) => void
  selectToday: (date: Date) => void
}

export const useDateStore = create<DateState>((set) => ({
  selectedDate: new Date(),
  viewedMonthStart: startOfMonth(Date.now(), DASHBOARD_TIME_ZONE),
  selectDate: (date) => set({ selectedDate: date }),
  showMonth: (monthStart) => set({ viewedMonthStart: monthStart }),
  selectToday: (date) =>
    set({
      selectedDate: date,
      viewedMonthStart: startOfMonth(date.getTime(), DASHBOARD_TIME_ZONE),
    }),
}))
