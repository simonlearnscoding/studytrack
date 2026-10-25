import { DASHBOARD_TIME_ZONE } from '@studytrack/backend/convex/workSessions/util'

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: DASHBOARD_TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

// A Task's current Day, read from the popover's block Day: the same Day needs no
// date, another one does.
export function taskDayLabel(plannedAt: number, dayStart: number): string {
  if (plannedAt === dayStart) return 'This day'
  return dayFormat.format(new Date(plannedAt))
}
