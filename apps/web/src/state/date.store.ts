import { create } from 'zustand'

/**
 * The date the dashboard is focused on. Defaults to today; the top-bar header
 * reads it to render the date and resets it to today, and the month calendar
 * reads it to mark the selected day and writes it back when a day is clicked.
 */
interface DateState {
  selectedDate: Date
  selectDate: (date: Date) => void
}

export const useDateStore = create<DateState>((set) => ({
  selectedDate: new Date(),
  selectDate: (date) => set({ selectedDate: date }),
}))
