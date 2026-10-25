import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/workSessions/util'

const dayLabelFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: DASHBOARD_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

// The Focus day is the Day every board is scoped to; comparing it with the clock
// is the only thing that decides whether a completion is live (ADR-0010).
export function isFocusDayToday(dayStart: number, now: number): boolean {
  return dayStart === startOfDay(now, DASHBOARD_TIME_ZONE)
}

// The task pane records completions against one Day, so it names that Day in full.
export function focusDayLabel(dayStart: number): string {
  return dayLabelFormat.format(new Date(dayStart))
}
