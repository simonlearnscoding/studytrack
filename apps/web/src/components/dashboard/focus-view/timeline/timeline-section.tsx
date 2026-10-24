import { api } from '@studytrack/backend/convex/_generated/api'
import {
  formatClock,
  mergeExpansion,
  resolveWindow,
  toMinute,
  toTimelineRows,
} from '@studytrack/backend/convex/timeline/util'
import type { DashboardMember } from '@studytrack/backend/convex/workSessions/types'
import { useMutation } from 'convex/react'
import { useRef, useState } from 'react'
import { useMounted } from '~/hooks/use-mounted'
import { cn } from '~/lib/utils'
import { Popover, PopoverAnchor, PopoverContent } from '~/components/ui/popover'
import { DayTimeline } from './view'
import type { PlanBlockClick, PlanBlockDrag } from './view/desktop-bar'
import type { WorkSessionClick } from './view/lanes/row-track'
import { useAutoExpansion } from './hooks/use-night-band-auto-expansion'
import { useElementWidth } from '~/hooks/use-element-width'
import { useExpansionPreference } from './hooks/use-night-band-preference'
import { useTimeline } from './hooks/use-timeline'
import { TimelinePopupContent, type TimelinePopupData } from './timeline-popup'
import { TimelineSkeleton } from './timeline-skeleton'
import { useMetric } from '~/hooks/use-metric-preference'

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
  const metric = useMetric()
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const availablePx = useElementWidth(scrollerRef, FALLBACK_TRACK_PX)
  const nowMin = toMinute(now, dayStart)
  const [popup, setPopup] = useState<{ data: TimelinePopupData; x: number; y: number } | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [manual, toggleBand] = useExpansionPreference()
  const auto = useAutoExpansion(nowMin)
  const createPlanBlock = useMutation(api.planBlocks.create)
  const updatePlanBlock = useMutation(api.planBlocks.update)
  const removePlanBlock = useMutation(api.planBlocks.remove)

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
  const draftPlanBlock =
    popup?.data.kind === 'draft'
      ? {
          startMin: toMinute(popup.data.startAt, dayStart),
          endMin: toMinute(popup.data.endAt, dayStart),
        }
      : null

  const openPlanBlock = (click: PlanBlockClick) => {
    const owner = members?.find((member) =>
      member.planBlocks.some((plan) => plan.id === click.planBlockId)
    )
    const plan = owner?.planBlocks.find((entry) => entry.id === click.planBlockId)
    const startAt = plan?.startAt ?? dayStart + click.startMin * 60_000
    const endAt = plan?.endAt ?? dayStart + click.endMin * 60_000
    setPopup({
      x: click.x,
      y: click.y,
      data: {
        kind: 'planBlock',
        planBlockId: click.planBlockId,
        member: owner?.name ?? owner?.discordId ?? null,
        startAt,
        endAt,
        missed: owner ? planBlockMissed(owner, startAt, endAt, now) : false,
        tasks: [],
      },
    })
  }

  const closePopup = () => {
    setPopup(null)
    setCreateError(null)
    setIsCreating(false)
  }

  // Both planning gestures (a drag draws the span, a double-click asks for two
  // hours) open the same draft popover. Nothing is stored until Create.
  const openPlanBlockDraft = (span: PlanBlockDrag) => {
    setCreateError(null)
    setIsCreating(false)
    setPopup({
      x: span.x,
      y: span.y,
      data: {
        kind: 'draft',
        startAt: dayStart + span.startMin * 60_000,
        endAt: dayStart + span.endMin * 60_000,
      },
    })
  }

  const createDraftPlanBlock = () => {
    if (popup?.data.kind !== 'draft') return
    const { startAt, endAt } = popup.data
    setIsCreating(true)
    setCreateError(null)
    void createPlanBlock({ dayStart, plannedStart: startAt, plannedEnd: endAt })
      .then(closePopup)
      .catch((error) => {
        console.error('[studytrack] plan create failed', error)
        setCreateError(planBlockCreateMessage(error))
        setIsCreating(false)
      })
  }

  const removePopupPlanBlock = () => {
    if (popup?.data.kind !== 'planBlock') return
    const planBlockId = popup.data.planBlockId
    void removePlanBlock({ planBlockId })
      .then(closePopup)
      .catch((error) => console.error('[studytrack] plan remove failed', error))
  }

  const openWorkSession = (click: WorkSessionClick) => {
    for (const member of members ?? []) {
      const workSession = member.workSessions.find((entry) => entry.id === click.workSessionId)
      if (!workSession) continue
      setPopup({
        x: click.x,
        y: click.y,
        data: {
          kind: 'workSession',
          workSessionId: click.workSessionId,
          member: member.name ?? member.discordId,
          startAt: workSession.startedAt,
          endAt: workSession.endedAt,
          live: workSession.status === 'active',
          tasks: workSession.tasks,
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
          isNightBandHeldOpen={auto.morning}
          onToggleBand={toggleBand}
          draftPlanBlock={draftPlanBlock}
          onPlanBlockDrag={openPlanBlockDraft}
          onPlanBlockDoubleClick={openPlanBlockDraft}
          onPlanBlockClick={openPlanBlock}
          onWorkSessionClick={openWorkSession}
          onPlanBlockUpdate={(update) => {
            void updatePlanBlock({
              planBlockId: update.planBlockId,
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
          if (!open) closePopup()
        }}
      >
        {popup && (
          <PopoverAnchor
            aria-hidden
            style={{ position: 'fixed', left: popup.x, top: popup.y, width: 0, height: 0 }}
          />
        )}
        <PopoverContent side="bottom" align="start" sideOffset={8} className="w-64 p-3">
          {popup && (
            <TimelinePopupContent
              key={
                popup.data.kind === 'planBlock'
                  ? popup.data.planBlockId
                  : popup.data.kind === 'workSession'
                    ? popup.data.workSessionId
                    : `draft-${popup.data.startAt}`
              }
              data={popup.data}
              dayStart={dayStart}
              now={now}
              onRemove={popup.data.kind === 'planBlock' ? removePopupPlanBlock : undefined}
              onCreate={popup.data.kind === 'draft' ? createDraftPlanBlock : undefined}
              onCancel={popup.data.kind === 'draft' ? closePopup : undefined}
              isCreating={popup.data.kind === 'draft' && isCreating}
              createError={popup.data.kind === 'draft' ? createError : null}
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

// A plan is missed once its window has passed without any non-break voice time
// overlapping it. Mirrors the timeline's own rule.
function planBlockMissed(
  member: DashboardMember,
  startAt: number,
  endAt: number,
  now: number
): boolean {
  if (endAt > now) return false
  return !member.workSessions.some((workSession) =>
    workSession.partials.some(
      (partial) =>
        partial.mode !== 'break' &&
        partial.startedAt < endAt &&
        (partial.endedAt ?? Number.POSITIVE_INFINITY) > startAt
    )
  )
}

// The two refusals a draft can still hit after the popover opened: the clock
// crossed the start, or a live read brought in an overlapping plan.
function planBlockCreateMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('overlaps')) return 'That time is already planned.'
  if (message.includes('past')) return 'That time is in the past.'
  return 'Could not create the plan.'
}
