import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from './avatar'
import type { BoardRow } from './data'

const periods = ['week', 'month'] as const
type Period = (typeof periods)[number]

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
  const [period, setPeriod] = useState<Period>('week')
  const [expanded, setExpanded] = useState(false)
  const rows = period === 'week' ? weekRows : monthRows
  const visible = expanded ? rows : rows.slice(0, initial)
  const hidden = Math.max(0, rows.length - initial)

  return (
    <section>
      <div className="pl-1">
        <div className="relative inline-flex rounded-full bg-white/[0.06] p-0.5">
          <span
            aria-hidden
            className={`absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%_-_2px)] rounded-full bg-white/[0.12] transition-transform duration-200 ease-out motion-reduce:transition-none ${
              period === 'month' ? 'translate-x-full' : ''
            }`}
          />
          {periods.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPeriod(p)
                setExpanded(false)
              }}
              aria-pressed={period === p}
              className={`relative w-16 cursor-pointer rounded-full py-1 text-center text-[10.5px] font-semibold tracking-[0.16em] uppercase transition-colors ${
                period === p ? 'text-foreground' : 'text-subtle-foreground hover:text-white/70'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      {visible.map((b) => (
        <div
          key={b.name}
          className={`grid items-center border-b border-white/[0.04] ${
            compact
              ? 'grid-cols-[20px_24px_minmax(0,1fr)_auto] gap-2 px-1 py-1.5'
              : 'max-lg:grid-cols-[18px_24px_1fr_44px_36px] max-lg:gap-2 lg:grid-cols-[20px_26px_minmax(90px,1fr)_96px_52px] gap-3 px-1.5 py-1.5'
          } ${b.you ? 'bg-primary/5 rounded-lg' : ''}`}
        >
          <span className={`text-subtle-foreground font-mono ${compact ? 'text-sm' : 'text-base'}`}>
            #{b.rank}
          </span>
          <Avatar initials={b.initials} color={b.color} size={24} />
          <p className={`truncate text-white/70 ${compact ? 'text-sm' : 'text-base'}`}>
            {b.name}
            {b.you && <span className="text-primary ml-1.5 text-base">you</span>}
          </p>
          <span
            className={`text-muted-foreground text-right font-mono ${compact ? 'text-sm' : 'text-base'}`}
          >
            {b.total}
          </span>
        </div>
      ))}
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
