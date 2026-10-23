import type { CalendarBucket } from '@studytrack/backend/convex/sessions/calendar'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { label } from './mock-data'
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

export function MonthCalendar({ calendar }: { calendar: MonthCalendarView }) {
  return (
    <section className="bg-card rounded-xl border p-4 max-lg:p-3.5">
      <div className="flex items-center justify-between gap-2 pb-2.5">
        <span className={label}>{calendar.label}</span>
        <div className="flex items-center gap-1">
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
        {calendar.cells.map((cell) =>
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
