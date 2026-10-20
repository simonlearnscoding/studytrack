import type { TimelinePlanVM, TimelineRowVM } from '@studytrack/backend/convex/timeline/types'
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

// Where a done-label starts after its dot, and the clear space kept before the
// next dot. `DOT_LABEL_MAX` bounds the last label on the lane.
const DOT_LABEL_LEAD = 6
const DOT_LABEL_TRAIL = 6
const DOT_LABEL_MAX = 160

// One person's track bar — shared by the scrolling list and the pinned lanes.
// Bars are positioned slices; dots mark completed tasks on the bar, each named
// by the task it marks (your lane only — the room's lanes are too short to read).
//
// Your lane is the hero of the surface: a taller capsule with an inset ring and
// bigger done-dots.
export function RowTrack({
  row,
  planOverride,
}: {
  row: TimelineRowVM
  planOverride?: PlanOverride | null
}) {
  const overridden = planOverride
    ? row.plans.findIndex((plan) => plan.id === planOverride.planId)
    : -1

  return (
    <div
      className={`relative w-full rounded-full ${
        row.you
          ? 'bg-white/[0.045] ring-1 ring-white/[0.05] h-5 cursor-crosshair ring-inset'
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
            className={`absolute top-0 bottom-0 rounded-[2px] border border-dashed ${
              plan.missed ? 'border-white/15 bg-white/[0.02]' : 'border-primary/55 bg-primary/10'
            }`}
            style={{ left: live.leftPx, width: live.widthPx }}
          />
        )
      })}
      {row.bars.map((bar, i) => (
        <div
          key={i}
          // A live bar is cut by the now-line, so its right end is squared off —
          // it is still running, the line just clips it. Every other end keeps
          // its round cap, since that is where study really started or stopped.
          className={`absolute top-0 bottom-0 ${bar.live ? 'rounded-l-full' : 'rounded-full'} ${barClass(bar.mode, bar.live)}`}
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
