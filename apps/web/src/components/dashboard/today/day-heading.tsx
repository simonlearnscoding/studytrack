import {
  DASHBOARD_TIME_ZONE,
  nextDayStart,
  previousDayStart,
  startOfDay,
} from '@studytrack/backend/convex/sessions/util'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useMounted } from '~/hooks/use-mounted'
import { useDateStore } from '~/state/date.store'

// The Focus day's date and its stepper, directly above the day lanes. The date
// used to live in the site header; it belongs with the day it describes. The
// arrows follow the calendar's arrow pattern and move the same shared Focus day
// the board and the task list already read.
const dayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: DASHBOARD_TIME_ZONE,
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

export function DayHeading({ now }: { now: number }) {
  const selectedDate = useDateStore((state) => state.selectedDate)
  const selectDate = useDateStore((state) => state.selectDate)
  const selectToday = useDateStore((state) => state.selectToday)
  // The label is derived from the client clock's Focus day, so gate it behind
  // mount to keep the server HTML and the first client paint identical.
  const mounted = useMounted()
  const dayStart = startOfDay(selectedDate.getTime(), DASHBOARD_TIME_ZONE)
  const isToday = !mounted || dayStart === startOfDay(now, DASHBOARD_TIME_ZONE)

  return (
    <div className="flex min-w-0 items-center gap-2">
      <h1 className="text-label truncate tracking-[0.18em]">
        {mounted ? (
          dayFormat.format(selectedDate)
        ) : (
          <span className="skeleton inline-block h-3 w-40 rounded" />
        )}
      </h1>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Previous day"
          onClick={() => selectDate(new Date(previousDayStart(dayStart, DASHBOARD_TIME_ZONE)))}
          className="text-subtle-foreground hover:text-foreground h-7 w-7"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Next day"
          onClick={() => selectDate(new Date(nextDayStart(dayStart, DASHBOARD_TIME_ZONE)))}
          className="text-subtle-foreground hover:text-foreground h-7 w-7"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      {!isToday && (
        <button
          type="button"
          onClick={() => selectToday(new Date())}
          className="text-label hover:text-foreground cursor-pointer transition-colors"
        >
          Today
        </button>
      )}
    </div>
  )
}
