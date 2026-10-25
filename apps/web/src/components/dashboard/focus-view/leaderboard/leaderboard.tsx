import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '~/components/ui/avatar'
import { formatMinutes } from '~/lib/format'
import { useLeaderboardPeriodPreference } from '~/preferences/use-leaderboard-period'
import { PeriodRange, type LeaderboardPeriod } from './period-range'
import type { LeaderboardRowVM } from './use-leaderboard'
import type { Metric } from '@studytrack/backend/convex/preferences/types'
import { useMetric } from '~/preferences/use-metric'

const periods = ['day', 'week', 'month'] as const
type Period = LeaderboardPeriod
const other = { focus: 'total', total: 'focus' } as Record<Metric, Metric>

type MergedRow = {
  key: string
  day?: LeaderboardRowVM
  week?: LeaderboardRowVM
  month?: LeaderboardRowVM
  rank: number
}

/** The row's minutes for one period · metric pair — the number the rank sorts on.
 *  A member missing from a period (no study in that Day, Week or Month) sorts last. */
const rowFor = (row: MergedRow, period: Period) => row[period]
const minutesFor = (row: MergedRow, period: Period, metric: Metric) =>
  rowFor(row, period)?.[metric] ?? -1

/** One row per person: join the Day, Week and Month lists on the member key,
 *  keeping anyone who appears in any. A member missing from one period still gets
 *  a row, with a dash in the periods they miss. */
function mergeRows(
  dayRows: LeaderboardRowVM[],
  weekRows: LeaderboardRowVM[],
  monthRows: LeaderboardRowVM[]
): MergedRow[] {
  const byKey = new Map<string, MergedRow>()
  for (const day of dayRows) byKey.set(day.key, { key: day.key, day, rank: 0 })
  for (const week of weekRows) {
    const existing = byKey.get(week.key)
    if (existing) existing.week = week
    else byKey.set(week.key, { key: week.key, week, rank: 0 })
  }
  for (const month of monthRows) {
    const existing = byKey.get(month.key)
    if (existing) existing.month = month
    else byKey.set(month.key, { key: month.key, month, rank: 0 })
  }
  return [...byKey.values()]
}

export function Leaderboard({
  dayRows,
  weekRows,
  monthRows,
  compact = false,
  initial = 10,
}: {
  dayRows: LeaderboardRowVM[]
  weekRows: LeaderboardRowVM[]
  monthRows: LeaderboardRowVM[]
  /** compact = slim row for the left rail */
  compact?: boolean
  /** rows shown before the "show more" affordance */
  initial?: number
}) {
  // The metric comes from the live-room rail's switch, which leads both the
  // numbers and the rank order here; the live surfaces follow it too. Defaults
  // to Deep focus.
  const metric = useMetric()
  // The Period is a Preference too, so the board opens on the member's last
  // choice across devices.
  const [sort, setSort] = useLeaderboardPeriodPreference()
  const [expanded, setExpanded] = useState(false)
  // The column header picks the Period that leads the rank; the other breaks ties.
  const rows = mergeRows(dayRows, weekRows, monthRows)
    .sort(
      (a, b) =>
        minutesFor(b, sort, metric) - minutesFor(a, sort, metric) ||
        minutesFor(b, sort, other[metric]) - minutesFor(a, sort, other[metric])
    )
    .map((row, i) => ({ ...row, rank: i + 1 }))
  const visible = expanded ? rows : rows.slice(0, initial)
  const hidden = Math.max(0, rows.length - initial)
  const isEmpty = rows.length === 0

  // shared by the header and body rows so the column buttons sit exactly over
  // the values they sort
  const grid = compact
    ? 'grid-cols-[16px_22px_minmax(0,1fr)_46px_46px_46px] gap-1 px-1 py-1.5'
    : 'grid-cols-[20px_26px_minmax(90px,1fr)_54px_54px_54px] gap-2 px-1.5 py-1.5'

  return (
    <section>
      {compact && (
        <div className="pb-2">
          <PeriodRange period={sort} />
        </div>
      )}
      <div className={`grid items-center ${grid} border-b border-white/[0.06] pb-1.5`}>
        {compact ? (
          <>
            <span className="col-span-2" />
            <span aria-hidden />
          </>
        ) : (
          <div className="col-span-3 min-w-0">
            <PeriodRange period={sort} />
          </div>
        )}
        {periods.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setSort(p)}
            aria-pressed={sort === p}
            className={`text-[10.5px] cursor-pointer text-right font-semibold uppercase tracking-[0.16em] transition-colors ${
              sort === p ? 'text-foreground' : 'text-subtle-foreground hover:text-foreground'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      {isEmpty ? (
        <div
          className={`flex items-center justify-center px-4 ${compact ? 'min-h-44' : 'min-h-48'}`}
        >
          <p className="text-body text-center text-muted-foreground">
            No workSessions yet. Join a study voice channel to start the board.
          </p>
        </div>
      ) : (
        visible.map((b) => {
          // The Week is the lead row; a member the Week misses falls back to Month,
          // then Day (a focus day outside both would be a future/past edge case).
          const lead = b.week ?? b.month ?? b.day
          if (!lead) return null
          return (
            <div
              key={b.key}
              className={`grid items-center border-b border-white/[0.04] ${grid} ${
                lead.you ? 'bg-primary/5 rounded-lg' : ''
              }`}
            >
              <span
                className={`text-subtle-foreground font-mono ${compact ? 'text-sm' : 'text-base'}`}
              >
                #{b.rank}
              </span>
              <Avatar initials={lead.initials} color={lead.color} size={24} />
              <p className={`truncate text-white/70 ${compact ? 'text-sm' : 'text-base'}`}>
                {lead.name}
                {lead.you && <span className="text-primary ml-1.5 text-base">you</span>}
              </p>
              {periods.map((p) => {
                const cell = rowFor(b, p)
                return (
                  <span
                    key={p}
                    className={`text-right font-mono whitespace-nowrap transition-colors ${compact ? 'text-sm' : 'text-base'} ${
                      cell
                        ? sort === p
                          ? 'text-foreground/75'
                          : 'text-subtle-foreground'
                        : 'text-hint'
                    }`}
                  >
                    {cell ? formatMinutes(cell[metric]) : '—'}
                  </span>
                )
              })}
            </div>
          )
        })
      )}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="text-subtle-foreground hover:text-foreground mt-2 flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] transition-colors"
        >
          {expanded ? 'Show less' : `Show ${hidden} more`}
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </section>
  )
}
