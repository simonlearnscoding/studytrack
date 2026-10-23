import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '../../../ui/avatar'
import { fmtHrs } from '../mock-data'
import { LeaderboardRange, type LeaderboardPeriod } from './period-range'
import type { BoardRow } from './use-leaderboard'
import type { Metric } from '@studytrack/backend/convex/preferences/types'
import { useMetric } from '~/hooks/use-metric-preference'

const periods = ['week', 'month'] as const
type Period = LeaderboardPeriod
const other = { focus: 'total', total: 'focus' } as Record<Metric, Metric>

type MergedRow = { key: string; week?: BoardRow; month?: BoardRow; rank: number }

/** The row's minutes for one period · metric pair — the number the rank sorts on.
 *  A member missing from a period (no study in that Week or Month) sorts last. */
const rowFor = (row: MergedRow, period: Period) => (period === 'week' ? row.week : row.month)
const minutesFor = (row: MergedRow, period: Period, metric: Metric) =>
  rowFor(row, period)?.[metric] ?? -1

/** One row per person: join the Week and Month lists on the member key, keeping
 *  anyone who appears in either. A member in the Month but not the focus Week (or
 *  the other way round) still gets a row, with a dash in the period they miss. */
function mergeRows(weekRows: BoardRow[], monthRows: BoardRow[]): MergedRow[] {
  const byKey = new Map<string, MergedRow>()
  for (const week of weekRows) byKey.set(week.key, { key: week.key, week, rank: 0 })
  for (const month of monthRows) {
    const existing = byKey.get(month.key)
    if (existing) existing.month = month
    else byKey.set(month.key, { key: month.key, month, rank: 0 })
  }
  return [...byKey.values()]
}

export function ConsistencyBoard({
  weekRows,
  monthRows,
  compact = false,
  initial = 5,
}: {
  weekRows: BoardRow[]
  monthRows: BoardRow[]
  /** compact = slim row for the left rail */
  compact?: boolean
  /** rows shown before the "show more" affordance */
  initial?: number
}) {
  // The metric comes from the live-room rail's switch, which leads both the
  // numbers and the rank order here; the live surfaces follow it too. Defaults
  // to Deep focus.
  const metric = useMetric()
  const [sort, setSort] = useState<Period>('week')
  const [expanded, setExpanded] = useState(false)
  // The column header picks the Period that leads the rank; the other breaks ties.
  const rows = mergeRows(weekRows, monthRows)
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
    ? 'grid-cols-[18px_24px_minmax(0,1fr)_52px_52px] gap-2 px-1 py-1.5'
    : 'grid-cols-[20px_26px_minmax(90px,1fr)_56px_56px] gap-3 px-1.5 py-1.5'

  return (
    <section>
      <LeaderboardRange period={sort} />
      <div className={`grid items-center ${grid} border-b border-white/[0.06] pb-1.5`}>
        <span className="col-span-2" />
        <span aria-hidden />
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
            No sessions yet. Join a study voice channel to start the board.
          </p>
        </div>
      ) : (
        visible.map((b) => {
          // The Week is the lead row; a member the Week misses falls back to Month.
          const lead = b.week ?? b.month
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
                    className={`text-right font-mono transition-colors ${compact ? 'text-sm' : 'text-base'} ${
                      cell
                        ? sort === p
                          ? 'text-foreground/75'
                          : 'text-subtle-foreground'
                        : 'text-hint'
                    }`}
                  >
                    {cell ? fmtHrs(cell[metric]) : '—'}
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
