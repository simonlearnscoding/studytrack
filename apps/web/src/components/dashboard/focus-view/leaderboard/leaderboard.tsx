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

type RankedRow = LeaderboardRowVM & { rank: number | null }

/** The rank the selected period's chosen metric leads with. Null when the member
 *  had no time in that period, so they sort after everyone who did. */
const rankFor = (row: LeaderboardRowVM, period: Period, metric: Metric) =>
  metric === 'focus' ? row[period].focusRank : row[period].totalRank

/** The row's displayed number for one period · metric pair. */
const minutesFor = (row: LeaderboardRowVM, period: Period, metric: Metric) => row[period][metric]

export function Leaderboard({
  rows,
  compact = false,
  initial = 10,
}: {
  rows: LeaderboardRowVM[]
  /** compact = slim row for the left rail */
  compact?: boolean
  /** rows shown before the "show more" affordance */
  initial?: number
}) {
  // The metric comes from the live-room rail's switch, which leads both the
  // numbers and the rank order here.
  const metric = useMetric()
  // The Period is a Preference too, so the board opens on the member's last
  // choice across devices.
  const [sort, setSort] = useLeaderboardPeriodPreference()
  const [expanded, setExpanded] = useState(false)
  // Ranking is over every member, not just the rows returned, so a row surfaced
  // by another period still shows its true standing — or none — here.
  const ranked: RankedRow[] = [...rows]
    .sort(
      (a, b) =>
        (rankFor(a, sort, metric) ?? Infinity) - (rankFor(b, sort, metric) ?? Infinity) ||
        a.key.localeCompare(b.key)
    )
    .map((row) => ({ ...row, rank: rankFor(row, sort, metric) }))
  const visible = expanded ? ranked : ranked.slice(0, initial)
  const hidden = Math.max(0, ranked.length - initial)
  const isEmpty = ranked.length === 0

  // shared by the header and body rows so the column buttons sit exactly over
  // the values they sort
  const grid = compact
    ? 'grid-cols-[16px_22px_minmax(0,1fr)_46px_46px_46px] gap-1 px-1 py-1.5'
    : 'grid-cols-[20px_26px_minmax(90px,1fr)_54px_54px_54px] gap-2 px-1.5 py-1.5'

  return (
    <section className="select-none">
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
        visible.map((row) => (
          <div
            key={row.key}
            className={`grid items-center border-b border-white/[0.04] ${grid} ${
              row.you ? 'bg-primary/5 rounded-lg' : ''
            }`}
          >
            <span
              className={`text-subtle-foreground font-mono ${compact ? 'text-sm' : 'text-base'}`}
            >
              {row.rank === null ? '—' : `#${row.rank}`}
            </span>
            <Avatar initials={row.initials} color={row.color} image={row.image} size={24} />
            <p className={`truncate text-white/70 ${compact ? 'text-sm' : 'text-base'}`}>
              {row.name}
              {row.you && <span className="text-primary ml-1.5 text-base">you</span>}
            </p>
            {periods.map((p) => (
              <span
                key={p}
                className={`text-right font-mono whitespace-nowrap transition-colors ${compact ? 'text-sm' : 'text-base'} ${
                  sort === p ? 'text-foreground/75' : 'text-subtle-foreground'
                }`}
              >
                {formatMinutes(minutesFor(row, p, metric))}
              </span>
            ))}
          </div>
        ))
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
