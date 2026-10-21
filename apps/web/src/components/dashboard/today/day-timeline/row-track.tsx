import type {
  TimelineBarVM,
  TimelinePlanVM,
  TimelineRowVM,
} from '@studytrack/backend/convex/timeline/types'
import { Fragment } from 'react'
import { barClass } from '../bar-style'

// The plan currently being moved or resized. Its live geometry replaces the
// stored piece(s) while the gesture is active, so the block follows the pointer
// without a second "before" outline.
export type PlanOverride = {
  planId: TimelinePlanVM['id']
  leftPx: number
  widthPx: number
}

// A click on a session bar, with the viewport point the popover should anchor to.
export type SessionClick = {
  sessionId: TimelineBarVM['sessionId']
  x: number
  y: number
}

// Where a done-label starts after its dot, and the clear space kept before the
// next dot. `DOT_LABEL_MAX` bounds the last label on the lane.
const DOT_LABEL_LEAD = 6
const DOT_LABEL_TRAIL = 6
const DOT_LABEL_MAX = 160

// One person's track bar — shared by the scrolling list and the pinned lanes.
// Bars are positioned slices; dots mark completed tasks on the bar, each named
// by the task it marks (your lane only — the room's lanes are too short to read).
//
// Your lane is the hero of the surface: a much taller lane whose fill is
// clearly visible (a faint fill reads as a 1px hairline however tall the box
// is), with an inset ring and bigger done-dots. The lane box itself is square;
// the only round ends on it are the two caps of a session.
export function RowTrack({
  row,
  planOverride,
  onSessionClick,
}: {
  row: TimelineRowVM
  planOverride?: PlanOverride | null
  onSessionClick?: (click: SessionClick) => void
}) {
  const overridden = planOverride
    ? row.plans.findIndex((plan) => plan.id === planOverride.planId)
    : -1

  return (
    <div
      className={`relative w-full ${
        row.you
          ? 'bg-white/[0.12] ring-1 ring-white/[0.1] h-9 cursor-crosshair ring-inset'
          : 'h-2.5 bg-white/[0.035]'
      }`}
    >
      {row.plans.map((plan, i) => {
        // A plan split by the night band has several pieces; the override covers
        // the first one and hides the rest, so the gesture never doubles a block.
        if (planOverride && plan.id === planOverride.planId && i !== overridden) return null
        const live = planOverride && i === overridden ? planOverride : plan
        return (
          <div
            key={`plan-${i}`}
            title={plan.missed ? 'Missed plan' : 'Planned session'}
            className={`absolute top-0 bottom-0 border border-dashed ${
              plan.missed ? 'border-white/15 bg-white/[0.02]' : 'border-primary/55 bg-primary/10'
            }`}
            style={{ left: live.leftPx, width: live.widthPx }}
          />
        )
      })}
      {row.bars.map((bar, i) => (
        <div
          key={i}
          data-session-id={bar.sessionId}
          role={onSessionClick ? 'button' : undefined}
          tabIndex={onSessionClick ? 0 : undefined}
          aria-label={onSessionClick ? 'Open study session' : undefined}
          onClick={
            onSessionClick
              ? (event) => {
                  event.stopPropagation()
                  const rect = event.currentTarget.getBoundingClientRect()
                  onSessionClick({
                    sessionId: bar.sessionId,
                    x: event.clientX || rect.left,
                    y: event.clientY || rect.top,
                  })
                }
              : undefined
          }
          onKeyDown={
            onSessionClick
              ? (event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  const rect = event.currentTarget.getBoundingClientRect()
                  onSessionClick({ sessionId: bar.sessionId, x: rect.left, y: rect.top })
                }
              : undefined
          }
          // The round caps belong to the session, not this stretch: the adapter
          // marks the first visible piece `roundStart` (always — a session
          // beginning is a beginning even when it began off screen) and the last
          // `roundEnd` only once the session has ended. Partial boundaries in
          // between stay square, so a mode change or a pause and return reads
          // as one continuous line instead of a row of pills.
          className={`absolute top-0 bottom-0 ${bar.roundStart ? 'rounded-l-full' : ''} ${bar.roundEnd ? 'rounded-r-full' : ''} ${barClass(bar.mode, bar.live)} ${onSessionClick ? 'cursor-pointer' : ''}`}
          style={{ left: bar.leftPx, width: bar.widthPx }}
        />
      ))}
      {row.dots.map((dot, i) => {
        const next = row.dots[i + 1]
        return (
          <Fragment key={i}>
            <span
              className={`border-primary/75 bg-background absolute top-1/2 z-[3] -translate-x-1/2 -translate-y-1/2 rounded-[2px] border-[1.5px] ${
                row.you ? 'h-2 w-2' : 'h-1.5 w-1.5'
              }`}
              style={{ left: dot.leftPx }}
            />
            {row.you && (
              // The title of the task finished here. The next dot caps it, so two
              // tasks ticked close together can never collide — the earlier one
              // just ellipsises.
              <span
                className="text-caption text-subtle-foreground pointer-events-none absolute top-1/2 -translate-y-1/2 truncate font-mono"
                style={{
                  left: dot.leftPx + DOT_LABEL_LEAD,
                  maxWidth: next
                    ? Math.max(0, next.leftPx - dot.leftPx - DOT_LABEL_LEAD - DOT_LABEL_TRAIL)
                    : DOT_LABEL_MAX,
                }}
              >
                {dot.title}
              </span>
            )}
          </Fragment>
        )
      })}
      {row.you && (
        <span className="pointer-events-none absolute -bottom-4 left-0 font-mono text-[9px] text-white/25">
          tap empty time to plan
        </span>
      )}
    </div>
  )
}
