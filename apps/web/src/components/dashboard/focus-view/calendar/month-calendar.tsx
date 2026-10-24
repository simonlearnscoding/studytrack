import type { CalendarBucket } from '@studytrack/backend/convex/workSessions/calendar'
import { DASHBOARD_TIME_ZONE } from '@studytrack/backend/convex/workSessions/util'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import type { MonthCalendarView } from './use-month-calendar'

// The fixed heat scale stays visible as dot intensity: a colour always means the
// same amount of study. Bucket 0 has no dot, so absence and low study stay
// distinguishable without filling the calendar with green.
const bucketDot: Record<CalendarBucket, string> = {
  0: '',
  1: 'bg-primary/35',
  2: 'bg-primary/55',
  3: 'bg-primary/75',
  4: 'bg-primary',
}

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const dayLabelFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: DASHBOARD_TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function MonthCalendar({
  calendar,
  isEmbedded = false,
}: {
  calendar: MonthCalendarView
  isEmbedded?: boolean
}) {
  const [isExpanded, setExpanded] = useState(false)
  // The embedded rail calendar starts folded to one week so the task pane keeps
  // the room; the standalone card always shows the whole month.
  const isFolded = isEmbedded && !isExpanded
  const label = isFolded ? calendar.weekLabel : calendar.monthLabel
  const cells = isFolded ? calendar.weekCells : calendar.monthCells
  const moveBack = isFolded ? calendar.previousWeek : calendar.previousMonth
  const moveForward = isFolded ? calendar.nextWeek : calendar.nextMonth
  const period = isFolded ? 'week' : 'month'

  const toggleExpanded = () => {
    if (isExpanded) {
      calendar.showFocusWeek()
    } else {
      calendar.showWeekMonth()
    }
    setExpanded((expanded) => !expanded)
  }

  return (
    <section className={cn('p-3.5', isEmbedded ? 'shrink-0' : 'bg-card rounded-xl border')}>
      <div className="flex min-w-0 items-center gap-1 pb-3">
        <span className="min-w-0 truncate text-sm font-medium text-foreground">{label}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Previous ${period}`}
          onClick={moveBack}
          className="text-subtle-foreground hover:text-foreground h-6 w-6 shrink-0"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Next ${period}`}
          onClick={moveForward}
          className="text-subtle-foreground hover:text-foreground h-6 w-6 shrink-0"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        {isEmbedded ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={isExpanded}
            aria-label={
              isExpanded ? 'Collapse calendar to one week' : 'Expand calendar to full month'
            }
            onClick={toggleExpanded}
            className="text-muted-foreground hover:text-foreground ml-auto h-7 shrink-0 gap-1.5 rounded-md px-2 text-caption"
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            <span>{isExpanded ? 'Collapse' : 'Expand month'}</span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            )}
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weekdays.map((day) => (
          <span key={day} className="text-label pb-1 text-center">
            {day}
          </span>
        ))}
        {cells.map((cell) =>
          cell.inMonth ? (
            <button
              key={cell.dayStart}
              type="button"
              onClick={() => calendar.selectDay(cell.dayStart)}
              aria-label={dayLabelFormat.format(new Date(cell.dayStart))}
              aria-pressed={cell.isFocus}
              className={cn(
                'flex h-10 cursor-pointer flex-col items-center justify-center gap-1 rounded-md font-mono text-xs transition-colors',
                cell.isFocus
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : cell.isToday
                    ? 'text-primary ring-1 ring-primary/30 ring-inset hover:bg-white/[0.04]'
                    : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
                cell.isFuture && !cell.isFocus && 'text-hint opacity-45'
              )}
            >
              <span>{cell.dayOfMonth}</span>
              {cell.bucket > 0 ? (
                <span
                  aria-hidden
                  className={cn(
                    'h-1 w-1 rounded-full',
                    cell.isFocus ? 'bg-primary-foreground/70' : bucketDot[cell.bucket]
                  )}
                />
              ) : null}
            </button>
          ) : (
            <span key={cell.dayStart} aria-hidden className="h-10" />
          )
        )}
      </div>
    </section>
  )
}
