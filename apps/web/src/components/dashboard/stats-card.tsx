import { Clock3, Target, Users, Video, type LucideIcon } from 'lucide-react'

type Metric = { icon: LucideIcon; value: string; label: string }

// Placeholder metrics — presentational only for this iteration; wiring real
// statistics comes with the personal-rail stats ticket.
const METRICS: Metric[] = [
  { icon: Clock3, value: '6h 42m', label: 'Total study time' },
  { icon: Users, value: '12', label: 'People today' },
  { icon: Video, value: '27', label: 'Sessions' },
  { icon: Target, value: '86%', label: 'Focus rate' },
]

// The period selector is visual only for now; period switching comes with the
// stats wiring.
const PERIODS = ['Today', 'Week', 'Month'] as const

export function StatsCard() {
  return (
    <section
      aria-label="Statistics"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Statistics
        </h2>
        <div
          className="flex items-center rounded-lg bg-secondary p-0.5 text-[11px] font-medium"
          aria-label="Statistics period"
        >
          {PERIODS.map((period, i) => (
            <span
              key={period}
              className={
                i === 0
                  ? 'rounded-md bg-card px-2 py-0.5 text-foreground shadow-sm'
                  : 'cursor-default px-2 py-0.5 text-muted-foreground/70'
              }
            >
              {period}
            </span>
          ))}
        </div>
      </header>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {METRICS.map(({ icon: Icon, value, label }) => (
          <div key={label} className="rounded-xl border border-border bg-background/40 p-3">
            <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
            <div className="mt-2 font-mono text-lg font-semibold tabular-nums text-foreground">
              {value}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
