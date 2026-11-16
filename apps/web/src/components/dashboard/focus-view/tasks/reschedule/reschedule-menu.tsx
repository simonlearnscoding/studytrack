import { buildRescheduleMonth, rescheduleQuickPicks } from '@studytrack/backend/convex/tasks/util'
import { monthLabel } from '@studytrack/backend/convex/workSessions/calendar'
import {
  DASHBOARD_TIME_ZONE,
  shiftMonth,
  startOfMonth,
} from '@studytrack/backend/convex/workSessions/util'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '~/lib/utils'

// The quick picks and the mini calendar of the reschedule popover. Picking any
// Day closes the popover and moves the task; the calendar's month pager only
// changes the grid.
export function RescheduleMenu({
  taskDayStart,
  todayStart,
  onPick,
}: {
  taskDayStart: number
  todayStart: number
  onPick: (plannedAt: number) => void
}) {
  const [monthStart, setMonthStart] = useState(() =>
    startOfMonth(taskDayStart, DASHBOARD_TIME_ZONE)
  )
  const quickPicks = rescheduleQuickPicks(todayStart, DASHBOARD_TIME_ZONE)
  const cells = buildRescheduleMonth({
    monthStart,
    taskDayStart,
    todayStart,
    timeZone: DASHBOARD_TIME_ZONE,
  })

  const pageMonth = (months: number) => {
    setMonthStart((current) => shiftMonth(current, months, DASHBOARD_TIME_ZONE))
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-1">
        {quickPicks.map((pick) => {
          const isTaskDay = pick.dayStart === taskDayStart
          return (
            <button
              key={pick.kind}
              type="button"
              onClick={() => onPick(pick.dayStart)}
              aria-current={isTaskDay ? 'date' : undefined}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-1 py-1.5 transition-colors',
                isTaskDay
                  ? 'border-primary/40 bg-primary-tint'
                  : 'border-border bg-secondary/40 hover:border-border-strong hover:bg-secondary'
              )}
            >
              <span className={cn('text-caption leading-none', isTaskDay && 'text-primary')}>
                {QUICK_PICK_LABELS[pick.kind]}
              </span>
              <span
                className={cn(
                  'text-caption font-mono leading-none',
                  isTaskDay ? 'text-primary/70' : 'text-subtle-foreground'
                )}
              >
                {PICK_DATE_FORMAT.format(new Date(pick.dayStart))}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-caption text-foreground">
          {monthLabel(monthStart, DASHBOARD_TIME_ZONE)}
        </p>
        <div className="flex items-center gap-0.5">
          <MonthPageButton label="Previous month" onClick={() => pageMonth(-1)}>
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          </MonthPageButton>
          <MonthPageButton label="Next month" onClick={() => pageMonth(1)}>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </MonthPageButton>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-y-0.5">
        {WEEKDAY_INITIALS.map((initial) => (
          <span
            key={initial}
            aria-hidden
            className="text-label flex h-5 items-center justify-center"
          >
            {initial}
          </span>
        ))}
        {cells.map((cell) => (
          <button
            key={cell.dayStart}
            type="button"
            onClick={() => onPick(cell.dayStart)}
            aria-label={CELL_LABEL_FORMAT.format(new Date(cell.dayStart))}
            aria-current={cell.isTaskDay ? 'date' : undefined}
            className={cn(
              'mx-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-md font-mono text-caption transition-colors',
              cell.isTaskDay
                ? 'bg-primary text-primary-foreground'
                : cell.isToday
                  ? 'text-primary ring-1 ring-primary/50 hover:bg-primary/10'
                  : cell.inMonth
                    ? 'text-foreground hover:bg-secondary'
                    : 'text-hint hover:bg-secondary hover:text-muted-foreground'
            )}
          >
            {cell.dayOfMonth}
          </button>
        ))}
      </div>
    </div>
  )
}

function MonthPageButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="text-muted-foreground hover:bg-secondary hover:text-foreground flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-colors"
    >
      {children}
    </button>
  )
}

const QUICK_PICK_LABELS = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  'next-week': 'Next week',
} as const

// Monday-first, matching the board's Week everywhere else.
const WEEKDAY_INITIALS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const PICK_DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: DASHBOARD_TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
})

const CELL_LABEL_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: DASHBOARD_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
