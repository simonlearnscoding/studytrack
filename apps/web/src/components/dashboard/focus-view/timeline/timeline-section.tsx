import { api } from '@studytrack/backend/convex/_generated/api'
import {
  formatClock,
  mergeExpansion,
  resolveWindow,
  toMinute,
  toTimelineRows,
} from '@studytrack/backend/convex/timeline/util'
import { DAY_MINUTES } from '@studytrack/backend/convex/timeline/types'
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
import {
  TimelinePopupContent,
  type PlanBlockFormValues,
  type TimelinePopupData,
} from './timeline-popup'
import { TimelineSkeleton } from './timeline-skeleton'
import { useMetric } from '~/preferences/use-metric'

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
export function TimelineSection({ dayStart }: { dayStart: number }) {
  const { members, now, me, isToday, isPast } = useTimeline(dayStart)
  // The lane tails follow the site-wide metric switch; lanes and their order
  // (sorted by Total) never change with it (ST-12).
  const metric = useMetric()
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const availablePx = useElementWidth(scrollerRef, FALLBACK_TRACK_PX)
  // Only today has a moving clock. A closed Day opens at midday and a future Day
  // at midnight — positions for scrolling and expansion, never a "now" line.
  const viewNowMin = isToday ? toMinute(now, dayStart) : isPast ? DAY_MINUTES / 2 : 0
  const [popup, setPopup] = useState<{ data: TimelinePopupData; x: number; y: number } | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [manual, toggleBand] = useExpansionPreference()
  // Future days have no clock (minute 0), but they must not auto-open the night
  // band either, so the expansion seed stays at midday for every non-today Day.
  const auto = useAutoExpansion(isToday ? viewNowMin : DAY_MINUTES / 2)
  const createPlanBlock = useMutation(api.planBlocks.create)
  const updatePlanBlock = useMutation(api.planBlocks.update)
  const removePlanBlock = useMutation(api.planBlocks.remove)

  // False on the server, the first client paint, and while the live read lands —
  // the reveal commit lands the measured width and the members together, so the
  // lanes fade in once, at their final size.
  const ready = useMounted() && members !== undefined

  // Pure derivations — no manual memoization; the React Compiler handles it.
  const expansion = mergeExpansion(manual, auto)
  const axis = resolveWindow({ nowMin: viewNowMin, availablePx, expansion })
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
        title: plan?.title ?? null,
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
    setUpdateError(null)
    setIsUpdating(false)
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

  const createDraftPlanBlock = (values: PlanBlockFormValues) => {
    if (popup?.data.kind !== 'draft') return
    setIsCreating(true)
    setCreateError(null)
    void createPlanBlock({
      dayStart,
      title: values.title,
      plannedStart: dayStart + values.startMin * 60_000,
      plannedEnd: dayStart + values.endMin * 60_000,
    })
      .then(closePopup)
      .catch((error) => {
        console.error('[studytrack] plan create failed', error)
        setCreateError(planBlockWriteMessage(error, 'Could not create the plan.'))
        setIsCreating(false)
      })
  }

  const updatePopupPlanBlock = (values: PlanBlockFormValues) => {
    if (popup?.data.kind !== 'planBlock') return
    setIsUpdating(true)
    setUpdateError(null)
    void updatePlanBlock({
      planBlockId: popup.data.planBlockId,
      title: values.title,
      plannedStart: dayStart + values.startMin * 60_000,
      plannedEnd: dayStart + values.endMin * 60_000,
    })
      .then(closePopup)
      .catch((error) => {
        console.error('[studytrack] plan update failed', error)
        setUpdateError(planBlockWriteMessage(error, 'Could not update the plan.'))
        setIsUpdating(false)
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
          nowLabel={`now · ${formatClock(viewNowMin)}`}
          showNow={isToday}
          scrollerRef={scrollerRef}
          isNightBandHeldOpen={auto.morning}
          onToggleBand={toggleBand}
          draftPlanBlock={draftPlanBlock}
          onPlanBlockDrag={isPast ? undefined : openPlanBlockDraft}
          onPlanBlockDoubleClick={isPast ? undefined : openPlanBlockDraft}
          onPlanBlockClick={openPlanBlock}
          onWorkSessionClick={openWorkSession}
          onPlanBlockUpdate={
            isPast
              ? undefined
              : (update) => {
                  void updatePlanBlock({
                    planBlockId: update.planBlockId,
                    ...(update.title == null ? {} : { title: update.title }),
                    plannedStart: dayStart + update.startMin * 60_000,
                    plannedEnd: dayStart + update.endMin * 60_000,
                  }).catch((error) => console.error('[studytrack] plan update failed', error))
                }
          }
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
              onUpdate={popup.data.kind === 'planBlock' ? updatePopupPlanBlock : undefined}
              onCancel={popup.data.kind === 'draft' ? closePopup : undefined}
              isCreating={popup.data.kind === 'draft' && isCreating}
              isUpdating={popup.data.kind === 'planBlock' && isUpdating}
              createError={popup.data.kind === 'draft' ? createError : null}
              updateError={popup.data.kind === 'planBlock' ? updateError : null}
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

// The refusals a write can still hit after the popover opened: the clock crossed
// the start, a live read brought in an overlapping plan, or the block started
// while the fields were open. Mirrors the backend's messages without leaking them.
function planBlockWriteMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('overlaps')) return 'That time is already planned.'
  if (message.includes('past')) return 'That time is in the past.'
  if (message.includes('started')) return 'This plan has started; only its title can change.'
  if (message.includes('15-minute')) return 'Times sit on 15-minute marks.'
  if (message.includes('inside its Day')) return 'Keep the plan inside its day.'
  return fallback
}
