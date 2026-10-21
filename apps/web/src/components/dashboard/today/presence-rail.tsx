import type { DashboardMember } from '@studytrack/backend/convex/sessions/types'
import { useMetric } from '~/hooks/use-metric-preference'
import { useMounted } from '~/hooks/use-mounted'
import { useNow } from '~/hooks/use-now'
import { cn } from '~/lib/utils'
import { LiveDot } from '../live-dot'
import { MetricToggle } from '../metric-toggle'
import { MODE_ICON, MODE_LABEL, MODE_TEXT } from '../mode-colors'
import { Avatar } from './avatar'
import { CollectiveFocusMeter } from './collective-focus-meter'
import { label } from './data'
import { toRoomPerson } from './use-room'

// The present-tense room rail: who is in a study channel right now, in join order.
// It owns its own ticking clock so its per-second updates stay off the rest of the
// page (and off the server render, via `useMounted`).
export function PresenceRail({
  members,
  className,
}: {
  members: DashboardMember[] | undefined
  className?: string
}) {
  const mounted = useMounted()
  const now = useNow(1000)
  // The idle line's trailing dots cycle 1→2→3 on the same second tick, so a member
  // with nothing to name still reads as alive rather than stuck.
  const dots = '.'.repeat((Math.floor(now / 1000) % 3) + 1)
  // The live "time in session" cuts follow the site-wide metric switch.
  const metric = useMetric()
  const people = members?.map((member) => toRoomPerson(member, mounted ? now : null, metric))
  const loading = people === undefined
  // The room's shared timer: shown whenever someone is here, and gone with the
  // last person (the value is derived from the active sessions alone).
  const showMeter = people !== undefined && people.length > 0

  return (
    <aside className={cn('flex min-h-0 flex-col lg:order-none', className)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pb-2.5 pl-0.5">
        <div className={`flex items-center gap-2 ${label}`}>
          <LiveDot className="h-1.5 w-1.5 text-primary" />
          In the room
          <span className="text-muted-foreground tracking-normal">
            ·{' '}
            {loading ? (
              <span className="skeleton inline-block h-3 w-3 translate-y-px rounded" />
            ) : (
              people.length
            )}
          </span>
        </div>
        <div className="shrink-0">
          <MetricToggle />
        </div>
      </div>

      {showMeter && <CollectiveFocusMeter members={members ?? []} metric={metric} />}

      {people?.length === 0 && (
        <p className="text-subtle-foreground px-0.5 text-caption">No one is studying right now.</p>
      )}

      {/* contract: live members in join order · horizontal chips on mobile · the rail scrolls, not this list */}
      <div
        className="flex flex-col gap-2 pr-0.5
                  max-lg:flex-row max-lg:overflow-x-auto max-lg:overflow-y-hidden"
      >
        {loading
          ? [0, 1, 2].map((i) => <RoomRowSkeleton key={i} />)
          : people.map((p) => (
              <div
                key={p.key}
                className="card-surface px-3 py-2.5 max-lg:w-[10.5rem] max-lg:shrink-0"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar initials={p.initials} color={p.color} dot />
                  <p className="min-w-0 flex-1 truncate text-xs font-medium">{p.name}</p>
                  {p.mode && <ModeGlyph mode={p.mode} />}
                  <span className="text-primary font-mono text-xs font-medium">
                    {p.time ?? '—'}
                  </span>
                </div>
                <p className="text-subtle-foreground mt-1.5 truncate text-caption">
                  {p.task ?? `${p.idle}${dots}`}
                </p>
              </div>
            ))}
      </div>
    </aside>
  )
}

// The rail's loading stand-in: a member card's silhouette — avatar, name, time,
// then the task line — so the rows swell in place rather than popping.
function RoomRowSkeleton() {
  return (
    <div aria-hidden className="card-surface px-3 py-2.5 max-lg:w-[10.5rem] max-lg:shrink-0">
      <div className="flex items-center gap-2.5">
        <span className="skeleton h-8 w-8 shrink-0 rounded-full" />
        <span className="skeleton h-3 min-w-0 flex-1 rounded-full" />
        <span className="skeleton h-3 w-8 shrink-0 rounded-full" />
      </div>
      <span className="skeleton mt-1.5 block h-2.5 w-24 rounded-full" />
    </div>
  )
}

// The mode icon, beside the session length: how they are studying, in the mode's
// colour. `break` is not a way of studying, so it is excluded — no icon.
function ModeGlyph({ mode }: { mode: keyof typeof MODE_ICON }) {
  const Icon = MODE_ICON[mode]
  return (
    <Icon
      role="img"
      aria-label={MODE_LABEL[mode]}
      className={cn('h-3.5 w-3.5 shrink-0', MODE_TEXT[mode])}
    />
  )
}
