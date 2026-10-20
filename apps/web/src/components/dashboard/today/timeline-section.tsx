import { api } from '@studytrack/backend/convex/_generated/api'
import {
  formatClock,
  mergeExpansion,
  resolveWindow,
  toMinute,
  toTimelineRows,
} from '@studytrack/backend/convex/timeline/util'
import type { DashboardMember } from '@studytrack/backend/convex/sessions/types'
import { useMutation } from 'convex/react'
import { useRef, useState } from 'react'
import { useMounted } from '~/hooks/use-mounted'
import { cn } from '~/lib/utils'
import { Popover, PopoverAnchor, PopoverContent } from '~/components/ui/popover'
import { DayTimeline } from './day-timeline'
import type { PlanClick } from './day-timeline/desktop-bar'
import type { SessionClick } from './day-timeline/row-track'
import { useAutoExpansion } from './use-auto-expansion'
import { useElementWidth } from './use-element-width'
import { useExpansionPreference } from './use-expansion-preference'
import { useTimeline } from './use-timeline'
import { SessionPopupContent, type SessionPopupData } from './session-popup'
import { TimelineSkeleton } from './timeline-skeleton'
import { useMetricStore } from '~/state/metric.store'

// The width the track assumes before it has measured itself — the fixed-scale
// core (18h × 32px/h) from the expansion spec. Server and first paint agree.
const FALLBACK_TRACK_PX = 576

// The timeline's wiring shell: read the live day, measure the track container,
// run the pure helpers, and hand the view models to the dumb renderer.
//
// The lanes are first *seen* already at their true size: DayTimeline stays
// mounted (its scroller is what gets measured) but sits invisible behind a
// skeleton until `ready`, so there is no render-narrow-then-widen jump. The
// server renders the hidden state too, so hydration still matches. `ready` also
// waits for the live read, so the lanes never flash in empty.
export function TimelineSection() {
  const { members, now, dayStart, me } = useTimeline()
  // The lane tails follow the site-wide metric switch; lanes and their order
  // (sorted by Total) never change with it (ST-12).
  const metric = useMetricStore((s) => s.metric)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const availablePx = useElementWidth(scrollerRef, FALLBACK_TRACK_PX)
  const nowMin = toMinute(now, dayStart)
  const [popup, setPopup] = useState<{ data: SessionPopupData; x: number; y: number } | null>(null)
  const [manual, toggleBand] = useExpansionPreference()
  const auto = useAutoExpansion(nowMin)
  const createPlan = useMutation(api.plannedSessions.create)
  const updatePlan = useMutation(api.plannedSessions.update)
  const removePlan = useMutation(api.plannedSessions.remove)

  // False on the server, the first client paint, and while the live read lands —
  // the reveal commit lands the measured width and the members together, so the
  // lanes fade in once, at their final size.
  const ready = useMounted() && members !== undefined

  // Pure derivations — no manual memoization; the React Compiler handles it.
  const expansion = mergeExpansion(manual, auto)
  const axis = resolveWindow({ nowMin, availablePx, expansion })
  const rows = toTimelineRows(members ?? [], {
    now,
    dayStart,
    me,
    window: axis,
    metric,
  })

  const openPlan = (click: PlanClick) => {
    const owner = members?.find((member) => member.plans.some((plan) => plan.id === click.planId))
    const plan = owner?.plans.find((entry) => entry.id === click.planId)
    const startAt = plan?.startAt ?? dayStart + click.startMin * 60_000
    const endAt = plan?.endAt ?? dayStart + click.endMin * 60_000
    setPopup({
      x: click.x,
      y: click.y,
      data: {
        kind: 'plan',
        planId: click.planId,
        member: owner?.name ?? owner?.discordId ?? null,
        startAt,
        endAt,
        missed: owner ? planMissed(owner, startAt, endAt, now) : false,
        tasks: [],
      },
    })
  }

  const removePopupPlan = () => {
    if (popup?.data.kind !== 'plan') return
    const planId = popup.data.planId
    void removePlan({ planId })
      .then(() => setPopup(null))
      .catch((error) => console.error('[studytrack] plan remove failed', error))
  }

  const openSession = (click: SessionClick) => {
    for (const member of members ?? []) {
      const session = member.sessions.find((entry) => entry.id === click.sessionId)
      if (!session) continue
      setPopup({
        x: click.x,
        y: click.y,
        data: {
          kind: 'session',
          sessionId: click.sessionId,
          member: member.name ?? member.discordId,
          startAt: session.startedAt,
          endAt: session.endedAt,
          live: session.status === 'active',
          tasks: session.tasks,
        },
      })
      return
    }
  }

  return (
    <div className="relative">
      <div
        aria-hidden={!ready}
        className={cn(
          'transition-opacity duration-300 ease-out',
          ready ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <DayTimeline
          window={axis}
          rows={rows}
          nowLabel={`now · ${formatClock(nowMin)}`}
          scrollerRef={scrollerRef}
          locked={auto.morning}
          onToggleBand={toggleBand}
          onPlanDrag={(span) => {
            void createPlan({
              dayStart,
              plannedStart: dayStart + span.startMin * 60_000,
              plannedEnd: dayStart + span.endMin * 60_000,
            }).catch((error) => console.error('[studytrack] plan change failed', error))
          }}
          onPlanClick={openPlan}
          onSessionClick={openSession}
          onPlanUpdate={(update) => {
            void updatePlan({
              planId: update.planId,
              plannedStart: dayStart + update.startMin * 60_000,
              plannedEnd: dayStart + update.endMin * 60_000,
            }).catch((error) => console.error('[studytrack] plan update failed', error))
          }}
        />
      </div>
      {!ready && <TimelineSkeleton className="absolute inset-0" />}
      <Popover
        open={popup !== null}
        onOpenChange={(open) => {
          if (!open) setPopup(null)
        }}
      >
        {popup && (
          <PopoverAnchor
            aria-hidden
            style={{ position: 'fixed', left: popup.x, top: popup.y, width: 0, height: 0 }}
          />
        )}
        <PopoverContent side="bottom" align="start" sideOffset={8} className="w-80 p-4">
          {popup && (
            <SessionPopupContent
              key={popup.data.kind === 'plan' ? popup.data.planId : popup.data.sessionId}
              data={popup.data}
              dayStart={dayStart}
              now={now}
              onRemove={popup.data.kind === 'plan' ? removePopupPlan : undefined}
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

// A plan is missed once its window has passed without any non-break voice time
// overlapping it. Mirrors the timeline's own rule.
function planMissed(member: DashboardMember, startAt: number, endAt: number, now: number): boolean {
  if (endAt > now) return false
  return !member.sessions.some((session) =>
    session.partials.some(
      (partial) =>
        partial.mode !== 'break' &&
        partial.startedAt < endAt &&
        (partial.endedAt ?? Number.POSITIVE_INFINITY) > startAt
    )
  )
}
