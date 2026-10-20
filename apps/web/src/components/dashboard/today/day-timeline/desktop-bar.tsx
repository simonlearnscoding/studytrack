import type {
  TimelinePlanBlockVM,
  TimelineRowVM,
  TimelineWindow,
} from '@studytrack/backend/convex/timeline/types'
import { formatClock, minuteToPx } from '@studytrack/backend/convex/timeline/util'
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { LiveDot } from '../../live-dot'
import { HourLabels, NowLine, NowPill } from './axis-markers'
import { BandLayer } from './night-band'
import { pxToMinute } from './px-to-minute'
import { RowTrack } from './row-track'
import type { AxisSurface } from './types'
import { useMirrorScroll } from './use-mirror-scroll'

// A drag shorter than this is a click, not a plan.
const DRAG_PX_THRESHOLD = 4
// Planning snaps to 15-minute marks — the dashed preview, the reported span and
// the gridlines it aims at all share this grain (LD-6 leans 15).
const SNAP_MIN = 15

export type PlanDrag = { startMin: number; endMin: number }

// The earliest pixel a plan may start: the first 15-minute mark at and after
// "now". A plan never contains a past minute (LD-6), so this is the wall both
// the snapped preview and the reported span stop at.
function planFloorPx(segments: TimelineWindow['segments'], nowPx: number): number {
  const nowMin = pxToMinute(segments, nowPx)
  if (nowMin == null) return nowPx
  const floorMin = Math.ceil(nowMin / SNAP_MIN) * SNAP_MIN
  return minuteToPx(segments, floorMin) ?? nowPx
}

// Snap an axis pixel to the nearest 15-minute boundary, still in pixels:
// px → minute → snap → px. Raw pixels (and band-hidden positions) pass through.
// Never lands left of `floorPx`: dragging back is refused, exactly like the snap.
function snapPx(segments: TimelineWindow['segments'], px: number, floorPx: number): number {
  const minute = pxToMinute(segments, px)
  if (minute == null) return px
  const snapped = Math.round(minute / SNAP_MIN) * SNAP_MIN
  return Math.max(minuteToPx(segments, snapped) ?? px, floorPx)
}

// Is this pixel on top of an existing planned session? The half-open end lets a
// new plan start exactly where the previous one ends.
function insidePlan(px: number, blocks: TimelinePlanBlockVM[]): boolean {
  return blocks.some((block) => px >= block.startPx && px < block.endPx)
}

// Stop a drag at the next plan in the direction of travel, and never let it go
// left of the past wall. The from-pixel is always outside a plan (pointer-down
// rejects that), so only the blocks ahead of it can be walls.
function clampToPlans(
  px: number,
  fromPx: number,
  floorPx: number,
  widthPx: number,
  blocks: TimelinePlanBlockVM[]
): number {
  if (px >= fromPx) {
    const wall = blocks
      .filter((block) => block.startPx >= fromPx)
      .reduce((nearest, block) => Math.min(nearest, block.startPx), widthPx)
    return Math.min(Math.max(px, floorPx), widthPx, wall)
  }

  const wall = blocks
    .filter((block) => block.endPx <= fromPx)
    .reduce((nearest, block) => Math.max(nearest, block.endPx), floorPx)
  return Math.max(Math.min(px, widthPx), floorPx, wall)
}

// lg+ your labels + track pin as one bar directly under the hero (0..7rem),
// with the same bg + blur so the stack reads as a single element.
//
// The bar renders OUTSIDE the sideways scroller — a horizontal scroll container
// also captures vertical sticky descendants, so nothing that pins to the page
// may live inside it. Instead it holds an axis-width mirror that the scroll
// effect pans, and overflow-x-clip trims the overhang WITHOUT creating a scroll
// container — which is also why the pill may poke above the bar.
//
// Gestures: wheel over the bar pans the timeline (forwarded to the real
// scroller — the bar itself is a picture, not a scroll box). A drag across your
// lane is a *planning* gesture (LD-6), not a pan: it previews a dashed span
// live and reports `{ startMin, endMin }` on release. Planning is future-only —
// the preview refuses to snap back past now's quarter-hour, and a drag that
// begins before now plans nothing. Mobile plans by tap instead — see the pinned
// mobile lane.
export function PinnedDesktopBar({
  surface: { axis, bands, hidden, locked, onToggleBand },
  row,
  nowLabel,
  scrollerRef,
  onPlanDrag,
}: {
  surface: AxisSurface
  row?: TimelineRowVM
  nowLabel: string
  scrollerRef: RefObject<HTMLDivElement | null>
  onPlanDrag?: (span: PlanDrag) => void
}) {
  const mirrorRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  useMirrorScroll(scrollerRef, mirrorRef)
  const now = axis.nowPx

  // Wheel → pan. deltaX only: the vertical wheel keeps scrolling the page.
  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const onWheel = (event: WheelEvent) => {
      if (event.deltaX === 0) return
      const scroller = scrollerRef.current
      if (!scroller) return
      scroller.scrollLeft += event.deltaX
      event.preventDefault()
    }
    bar.addEventListener('wheel', onWheel, { passive: false })
    return () => bar.removeEventListener('wheel', onWheel)
  }, [scrollerRef])

  // The drag-to-plan selection, in axis pixels. `floorPx` is the past wall,
  // captured when the gesture starts so a ticking clock cannot drift it mid-drag.
  const [drag, setDrag] = useState<{
    fromPx: number
    toPx: number
    floorPx: number
  } | null>(null)

  const lanePx = (event: ReactPointerEvent) => {
    const mirror = mirrorRef.current
    if (!mirror) return 0
    const px = event.clientX - mirror.getBoundingClientRect().left
    return Math.max(0, Math.min(px, axis.widthPx))
  }

  const onLanePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    const fromPx = lanePx(event)
    const floorPx = planFloorPx(axis.segments, now)
    // A gesture that begins in the past, or on top of an existing plan, plans
    // nothing at all: both walls are hard at the start.
    if (fromPx < floorPx) return
    if (insidePlan(fromPx, row?.planBlocks ?? [])) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ fromPx, toPx: fromPx, floorPx })
  }

  const onLanePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return
    const toPx = clampToPlans(
      lanePx(event),
      drag.fromPx,
      drag.floorPx,
      axis.widthPx,
      row?.planBlocks ?? []
    )
    if (drag.toPx === toPx) return
    // `fromPx` and `floorPx` are frozen when the gesture starts, so the closure
    // values are safe here.
    setDrag({ fromPx: drag.fromPx, toPx, floorPx: drag.floorPx })
  }

  const onLanePointerUp = () => {
    if (drag) {
      const from = snapPx(axis.segments, Math.min(drag.fromPx, drag.toPx), drag.floorPx)
      const to = snapPx(axis.segments, Math.max(drag.fromPx, drag.toPx), drag.floorPx)
      if (to - from >= DRAG_PX_THRESHOLD) {
        const startMin = pxToMinute(axis.segments, from)
        const endMin = pxToMinute(axis.segments, to)
        if (startMin != null && endMin != null) {
          onPlanDrag?.({ startMin: Math.round(startMin), endMin: Math.round(endMin) })
        }
      }
    }
    setDrag(null)
  }

  // The preview snaps live, so the dashed block always sits on the grid — and
  // parks against the floor rather than sliding into the past.
  const dragLeft = drag ? snapPx(axis.segments, Math.min(drag.fromPx, drag.toPx), drag.floorPx) : 0
  const dragWidth = drag
    ? snapPx(axis.segments, Math.max(drag.fromPx, drag.toPx), drag.floorPx) - dragLeft
    : 0
  const dragLabel = (() => {
    if (!drag || dragWidth < DRAG_PX_THRESHOLD) return null
    const startMin = pxToMinute(axis.segments, dragLeft)
    const endMin = pxToMinute(axis.segments, dragLeft + dragWidth)
    if (startMin == null || endMin == null) return null
    return `${formatClock(Math.round(startMin))} – ${formatClock(Math.round(endMin))}`
  })()

  return (
    <div
      ref={barRef}
      className="sticky top-19 z-[6] overflow-x-clip bg-background/80 backdrop-blur max-lg:hidden"
    >
      {/* the axis mirror — panned by useMirrorScroll, clipped by the bar */}
      <div ref={mirrorRef} className="relative" style={{ width: axis.widthPx }}>
        {/* the night bands, tappable here too — same strips, same toggle */}
        <BandLayer bands={bands} hidden={hidden} locked={locked} onToggle={onToggleBand} />
        {/* hour gridlines — the same ruler the scroller draws below, run up
            through your lane so the drag-to-plan span aims at the grid it
            snaps to (15-minute marks). They extend past the bar's bottom the
            same 0.875rem the now-line does, bridging the seam to the
            scroller's own lines so the ruler reads as one continuous thing */}
        {axis.ticks.map((t) => (
          <div
            key={t.label}
            className="absolute top-0 -bottom-3.5 w-px bg-white/[0.05]"
            style={{ left: t.leftPx }}
          />
        ))}
        {/* the now-line through the whole bar, run 0.875rem past the bottom so
            it bridges the gap to the scroller's own line below and reads as one
            line from pill to the last row */}
        <NowLine left={now} className="inset-y-0 -bottom-3.5" />
        <div className="relative h-6">
          <HourLabels ticks={axis.ticks} widthPx={axis.widthPx} className="top-3" />
          <NowPill label={nowLabel} left={now} className="-top-4 z-[7]" />
        </div>
        {/* your lane — taller than the room's: a details line above the track,
            and the track itself is the drag-to-plan surface. Without a
            signed-in row the bar degrades to the hour strip. */}
        {row && (
          <div className="h-[5.5rem] pt-3">
            <div className="mb-2 flex items-center gap-2">
              {row.live && <LiveDot className="h-1.5 w-1.5 shrink-0 text-primary" />}
              <span className="text-label">your day</span>
              <span className="text-caption font-mono">{row.tail}</span>
            </div>
            <div
              className="cursor-crosshair relative select-none"
              onPointerDown={onLanePointerDown}
              onPointerMove={onLanePointerMove}
              onPointerUp={onLanePointerUp}
              onPointerCancel={() => setDrag(null)}
            >
              <RowTrack row={row} />
              {drag && dragWidth >= DRAG_PX_THRESHOLD && (
                <div
                  className="border-primary/55 bg-primary/10 pointer-events-none absolute inset-y-0 rounded-[2px] border border-dashed"
                  style={{ left: dragLeft, width: dragWidth }}
                >
                  {dragLabel && (
                    <span className="bg-primary-tint text-primary absolute -top-4 left-0 block w-max rounded-md px-1.5 py-px font-mono text-label leading-none whitespace-nowrap">
                      {dragLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
