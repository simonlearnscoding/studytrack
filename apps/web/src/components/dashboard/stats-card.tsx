import { api } from '@studytrack/backend/convex/_generated/api'
import {
  focusRate,
  formatCompactMs,
  memberFocusMs,
  memberSpanTotalMs,
} from '@studytrack/backend/convex/sessions/metrics'
import { useQuery } from 'convex/react'
import { Clock3, Flame, Monitor, Users, type LucideIcon } from 'lucide-react'
import { useDayStart } from '~/hooks/use-day-start'
import { useNow } from '~/hooks/use-now'

type Metric = { icon: LucideIcon; value: string; label: string }

// Personal statistics for today: Total time (session spans, pauses included),
// Sessions, Focus rate (the camera/screen-share share of Total time) — plus
// People today, the one room number on the personal rail. The card subscribes
// to the same live query the room holds (Convex dedupes it) and finds self by
// userId; a member with no sessions today is absent from the payload, so all
// personal tiles fall back to their zero state.
export function StatsCard() {
  const dayStart = useDayStart()
  const now = useNow(1000)
  const me = useQuery(api.users.me)
  const members = useQuery(api.sessions.getTodaysActivitiesForDashboard, { dayStart })

  const loading = me === undefined || members === undefined
  const mine = members?.find((member) => member.userId !== null && member.userId === me?._id)

  const totalMs = mine ? memberSpanTotalMs(mine, now) : 0
  const rate = focusRate(mine ? memberFocusMs(mine, now) : 0, totalMs)

  const metrics: Metric[] = [
    { icon: Clock3, value: formatCompactMs(totalMs), label: 'Total time' },
    { icon: Users, value: String(members?.length ?? 0), label: 'People today' },
    { icon: Monitor, value: String(mine?.sessions.length ?? 0), label: 'Sessions' },
    {
      icon: Flame,
      value: rate === null ? '—' : `${Math.round(rate * 100)}%`,
      label: 'Focus rate',
    },
  ]

  return (
    <section
      aria-label="Statistics"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Statistics
      </h2>
      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[74px] animate-pulse rounded-xl border border-border bg-background/40 motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {metrics.map(({ icon: Icon, value, label }) => (
            <div key={label} className="rounded-xl border border-border bg-background/40 p-3">
              <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
              <div className="mt-2 font-mono text-lg font-semibold tabular-nums text-foreground">
                {value}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
