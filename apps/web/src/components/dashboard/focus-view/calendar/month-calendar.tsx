import type { CalendarBucket } from '@studytrack/backend/convex/sessions/calendar'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import type { MonthCalendarView } from './use-month-calendar'

// The fixed heat scale: a colour always means the same amount of study. Bucket 0
// has no fill, so absence and low study stay distinguishable.
const bucketFill: Record<CalendarBucket, string> = {
  0: '',
  1: 'bg-primary/[0.09]',
  2: 'bg-primary/[0.18]',
  3: 'bg-primary/30 text-white/55',
  4: 'bg-primary/[0.48] text-white/70',
}

const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function MonthCalendar({
  calendar,
  isEmbedded = false,
}: {
  calendar: MonthCalendarView
  isEmbedded?: boolean
}) {
  const [isExpanded, setExpanded] = useState(false)
  // The embedded rail calendar starts folded to the Focus day's week so it can
  // share the bubble with the task pane; the standalone card always shows the
  // whole month.
  const isFolded = isEmbedded && !isExpanded
  const focusIndex = calendar.cells.findIndex((cell) => cell.isFocus)
  const focusRow = focusIndex < 0 ? 0 : Math.floor(focusIndex / weekdays.length)
  const visibleCells = isFolded
    ? calendar.cells.slice(focusRow * weekdays.length, (focusRow + 1) * weekdays.length)
    : calendar.cells

  return (
    <section className={`p-4 max-lg:p-3.5 ${isEmbedded ? '' : 'bg-card rounded-xl border'}`}>
      <div className="flex items-center justify-between gap-2 pb-2.5">
        <span className="text-label">{calendar.label}</span>
        <div className="flex items-center gap-1">
          {isEmbedded ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Show current week' : 'Show full month'}
              onClick={() => setExpanded((expanded) => !expanded)}
              className="text-subtle-foreground hover:text-foreground h-7 w-7"
            >
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            onClick={calendar.previousMonth}
            className="text-subtle-foreground hover:text-foreground h-7 w-7"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next month"
            onClick={calendar.nextMonth}
            className="text-subtle-foreground hover:text-foreground h-7 w-7"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weekdays.map((day, i) => (
          <span key={i} className="text-label text-center">
            {day}
          </span>
        ))}
        {visibleCells.map((cell) =>
          cell.inMonth ? (
            <button
              key={cell.dayStart}
              type="button"
              onClick={() => calendar.selectDay(cell.dayStart)}
              aria-label={`${cell.dayOfMonth} ${calendar.label}`}
              aria-pressed={cell.isFocus}
              className={`flex aspect-[1.2] cursor-pointer items-end rounded-md border border-border-strong p-1 font-mono text-label tracking-normal text-subtle-foreground ${bucketFill[cell.bucket]} ${cell.isFocus ? 'ring-primary text-primary ring-1' : ''} ${cell.isFuture ? 'border-dashed opacity-45' : ''}`}
            >
              {cell.dayOfMonth}
            </button>
          ) : (
            <span key={cell.dayStart} aria-hidden className="aspect-[1.2]" />
          )
        )}
      </div>
    </section>
  )
}
