import type {
  TimelineBarVM,
  TimelinePlanBlockVM,
  TimelineRowVM,
  TimelineWindow,
} from '@studytrack/backend/convex/timeline/types'
import { formatClock, minuteToPx } from '@studytrack/backend/convex/timeline/util'
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { HourLabels, NowLine, NowPill } from './axis-markers'
import { BandLayer } from './night-band'
import { pxToMinute } from './px-to-minute'
import { RowTrack, type PlanOverride, type SessionClick } from './row-track'
import type { AxisSurface } from './types'
import { useMirrorScroll } from './use-mirror-scroll'

// A drag shorter than this is a click, not a plan.
const DRAG_PX_THRESHOLD = 4
// Planning snaps to 15-minute marks — the dashed preview, the reported span and
// the gridlines it aims at all share this grain (LD-6 leans 15).
const SNAP_MIN = 15
// A double-click on the lane plans a two-hour session at the clicked mark.
const DOUBLE_CLICK_PLAN_MIN = 2 * 60
// Keeps the cursor readout fully on the axis when the pointer nears an edge.
const CURSOR_LABEL_EDGE_PX = 28

export type PlanDrag = { startMin: number; endMin: number }
export type PlanUpdate = {
  planId: TimelinePlanBlockVM['id']
  startMin: number
  endMin: number
}
export type PlanClick = PlanUpdate & { x: number; y: number }

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

// One 15-minute step in pixels at this point on the axis.
function snapStepPx(segments: TimelineWindow['segments'], px: number): number {
  const minute = pxToMinute(segments, px)
  if (minute == null) return 0
  const from = minuteToPx(segments, minute)
  const to = minuteToPx(segments, minute + SNAP_MIN)
  return from === null || to === null ? 0 : to - from
}

// The from – until label every plan gesture wears. Creating a span, moving a
// block and resizing an edge all route through this, so the times read the same
// whichever gesture is in flight.
function spanLabel(
  segments: TimelineWindow['segments'],
  leftPx: number,
  widthPx: number
): string | null {
  const startMin = pxToMinute(segments, leftPx)
  const endMin = pxToMinute(segments, leftPx + widthPx)
  if (startMin == null || endMin == null) return null
  return `${formatClock(Math.round(startMin))} – ${formatClock(Math.round(endMin))}`
}

function PlanSpanLabel({ leftPx, label }: { leftPx: number; label: string }) {
  return (
    <span
      className="bg-primary-tint text-primary pointer-events-none absolute -top-4 z-[5] block w-max rounded-md px-1.5 py-px font-mono text-label leading-none whitespace-nowrap"
      style={{ left: leftPx }}
    >
      {label}
    </span>
  )
}

// A readout, not a plan: the quarter-hour a click or drag would start on. It
// follows the pointer and wears a neutral chip so it never reads as the
// emerald from – until label a real plan (or gesture) carries.
function CursorTimeLabel({ leftPx, label }: { leftPx: number; label: string }) {
  return (
    <span
      aria-hidden
      className="bg-background/95 text-foreground ring-white/15 pointer-events-none absolute -top-4 z-[5] block w-max -translate-x-1/2 rounded-md px-1.5 py-px font-mono text-label leading-none whitespace-nowrap ring-1"
      style={{ left: leftPx }}
    >
      {label}
    </span>
  )
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
// live and reports `{ startMin, endMin }` on release. A double-click on empty
// future lane creates a two-hour plan at that position instead. Planning is
// future-only — the preview refuses to snap back past now's quarter-hour, and a
// drag or double-click that begins before now plans nothing. Mobile plans by
// tap instead — see the pinned mobile lane.
export function PinnedDesktopBar({
  surface: { axis, bands, hidden, locked, onToggleBand },
  row,
  nowLabel,
  scrollerRef,
  onPlanDrag,
  onPlanDoubleClick,
  onPlanUpdate,
  onPlanClick,
  onSessionClick,
}: {
  surface: AxisSurface
  row?: TimelineRowVM
  nowLabel: string
  scrollerRef: RefObject<HTMLDivElement | null>
  onPlanDrag?: (span: PlanDrag) => void
  onPlanDoubleClick?: (span: PlanDrag) => void
  onPlanUpdate?: (update: PlanUpdate) => void
  onPlanClick?: (click: PlanClick) => void
  onSessionClick?: (click: SessionClick) => void
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

  // The edge being dragged on an existing plan. `edgePx` is the live snapped
  // edge; `minPx`/`maxPx` are the legal walls captured at pointer-down.
  const [resize, setResize] = useState<{
    planId: TimelinePlanBlockVM['id']
    edge: 'start' | 'end'
    startPx: number
    endPx: number
    edgePx: number
    minPx: number
    maxPx: number
  } | null>(null)

  // The whole block being moved. `leftPx` is the optimistic position; the
  // duration and the legal range are captured at pointer-down.
  const [move, setMove] = useState<{
    planId: TimelinePlanBlockVM['id']
    startPx: number
    widthPx: number
    grabPx: number
    leftPx: number
    minLeftPx: number
    maxLeftPx: number
    moved: boolean
  } | null>(null)

  // The committed geometry held on screen until the live read catches up, so a
  // released block never snaps back to its old position for a frame.
  const [pending, setPending] = useState<PlanOverride | null>(null)

  // The plan under a resting pointer, shown with the same from – until label
  // the gestures wear. Tracked by lane position rather than child enter/leave so
  // the resize handles can never make the label flicker as the pointer crosses
  // them. A gesture in flight owns the label instead, so it is suppressed then.
  const [hoveredPlanId, setHoveredPlanId] = useState<TimelinePlanBlockVM['id'] | null>(null)

  // Where the pointer rests on your lane, in axis pixels — the anchor for the
  // cursor time readout. Null whenever the pointer is off the lane.
  const [cursorPx, setCursorPx] = useState<number | null>(null)

  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => setPending(null), 1200)
    return () => clearTimeout(timer)
  }, [pending])

  const lanePx = (event: { clientX: number }) => {
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
    const pointerPx = lanePx(event)
    setCursorPx(pointerPx)
    const hovered = row?.planBlocks.find(
      (block) => pointerPx >= block.startPx && pointerPx < block.endPx
    )
    setHoveredPlanId(hovered?.id ?? null)
    if (!drag) return
    const toPx = clampToPlans(
      pointerPx,
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

  // Double-click the empty future lane for a two-hour plan snapped to the same
  // quarter-hour grid as a drag. Start on a plan or in the past plans nothing.
  const onLaneDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const px = lanePx(event)
    const floorPx = planFloorPx(axis.segments, now)
    if (px < floorPx) return
    const startPx = snapPx(axis.segments, px, floorPx)
    if (insidePlan(startPx, row?.planBlocks ?? [])) return
    const startMin = pxToMinute(axis.segments, startPx)
    if (startMin == null) return
    onPlanDoubleClick?.({
      startMin: Math.round(startMin),
      endMin: Math.round(startMin) + DOUBLE_CLICK_PLAN_MIN,
    })
  }

  // Start moving a whole block. Duration is frozen; the legal left range is the
  // gap between the past floor/previous plan and the next plan (or axis end).
  const startMove = (event: ReactPointerEvent<HTMLSpanElement>, block: TimelinePlanBlockVM) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    event.stopPropagation()
    const widthPx = block.endPx - block.startPx
    if (widthPx <= 0) return
    setPending(null)
    const floorPx = planFloorPx(axis.segments, now)
    const others = row?.planBlocks ?? []
    const previousEnd = others
      .filter((other) => other.id !== block.id && other.endPx <= block.startPx)
      .reduce((nearest, other) => Math.max(nearest, other.endPx), 0)
    const nextStart = others
      .filter((other) => other.id !== block.id && other.startPx >= block.endPx)
      .reduce((nearest, other) => Math.min(nearest, other.startPx), axis.widthPx)
    const minLeftPx = Math.max(floorPx, previousEnd)
    const maxLeftPx = Math.min(axis.widthPx - widthPx, nextStart - widthPx)
    if (maxLeftPx < minLeftPx) return

    event.currentTarget.setPointerCapture(event.pointerId)
    setMove({
      planId: block.id,
      startPx: block.startPx,
      widthPx,
      grabPx: lanePx(event),
      leftPx: block.startPx,
      minLeftPx,
      maxLeftPx,
      moved: false,
    })
  }

  const onMoveMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!move) return
    const pointerPx = lanePx(event)
    const delta = pointerPx - move.grabPx
    const snapped = snapPx(axis.segments, move.startPx + delta, 0)
    const leftPx = Math.max(move.minLeftPx, Math.min(snapped, move.maxLeftPx))
    const moved = move.moved || Math.abs(delta) >= DRAG_PX_THRESHOLD
    if (leftPx === move.leftPx && moved === move.moved) return
    setMove({ ...move, leftPx, moved })
  }

  const onMoveUp = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (move?.moved) {
      const startMin = pxToMinute(axis.segments, move.leftPx)
      const endMin = pxToMinute(axis.segments, move.leftPx + move.widthPx)
      if (startMin != null && endMin != null) {
        setPending({ planId: move.planId, leftPx: move.leftPx, widthPx: move.widthPx })
        onPlanUpdate?.({
          planId: move.planId,
          startMin: Math.round(startMin),
          endMin: Math.round(endMin),
        })
      }
    } else if (move) {
      // A press-and-release under the drag threshold is a click, not a move.
      const startMin = pxToMinute(axis.segments, move.startPx)
      const endMin = pxToMinute(axis.segments, move.startPx + move.widthPx)
      if (startMin != null && endMin != null) {
        onPlanClick?.({
          planId: move.planId,
          startMin: Math.round(startMin),
          endMin: Math.round(endMin),
          x: event.clientX,
          y: event.clientY,
        })
      }
    }
    setMove(null)
  }

  // Start dragging one edge of an existing plan. The wall on the far side is
  // the neighbouring plan (or the axis end); the near wall is the past floor.
  const startResize = (
    event: ReactPointerEvent<HTMLSpanElement>,
    block: TimelinePlanBlockVM,
    edge: 'start' | 'end'
  ) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    event.stopPropagation()
    setPending(null)
    const stepPx = snapStepPx(axis.segments, block.startPx)
    if (stepPx <= 0) return
    const floorPx = planFloorPx(axis.segments, now)
    const others = row?.planBlocks ?? []
    const previousEnd = others
      .filter((other) => other.id !== block.id && other.endPx <= block.startPx)
      .reduce((nearest, other) => Math.max(nearest, other.endPx), 0)
    const nextStart = others
      .filter((other) => other.id !== block.id && other.startPx >= block.endPx)
      .reduce((nearest, other) => Math.min(nearest, other.startPx), axis.widthPx)
    const minPx = edge === 'start' ? Math.max(floorPx, previousEnd) : block.startPx + stepPx
    const maxPx = edge === 'end' ? Math.min(axis.widthPx, nextStart) : block.endPx - stepPx
    if (maxPx <= minPx) return

    event.currentTarget.setPointerCapture(event.pointerId)
    setResize({
      planId: block.id,
      edge,
      startPx: block.startPx,
      endPx: block.endPx,
      edgePx: edge === 'start' ? block.startPx : block.endPx,
      minPx,
      maxPx,
    })
  }

  const onResizeMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!resize) return
    const snapped = snapPx(axis.segments, lanePx(event), 0)
    const edgePx = Math.max(resize.minPx, Math.min(snapped, resize.maxPx))
    if (edgePx === resize.edgePx) return
    setResize({ ...resize, edgePx })
  }

  const onResizeUp = () => {
    if (!resize) return
    const startPx = resize.edge === 'start' ? resize.edgePx : resize.startPx
    const endPx = resize.edge === 'end' ? resize.edgePx : resize.endPx
    const originalEdge = resize.edge === 'start' ? resize.startPx : resize.endPx
    const startMin = pxToMinute(axis.segments, startPx)
    const endMin = pxToMinute(axis.segments, endPx)
    if (resize.edgePx !== originalEdge && startMin != null && endMin != null && endPx > startPx) {
      setPending({
        planId: resize.planId,
        leftPx: startPx,
        widthPx: endPx - startPx,
      })
      onPlanUpdate?.({
        planId: resize.planId,
        startMin: Math.round(startMin),
        endMin: Math.round(endMin),
      })
    }
    setResize(null)
  }

  // The preview snaps live, so the dashed block always sits on the grid — and
  // parks against the floor rather than sliding into the past.
  const dragLeft = drag ? snapPx(axis.segments, Math.min(drag.fromPx, drag.toPx), drag.floorPx) : 0
  const dragWidth = drag
    ? snapPx(axis.segments, Math.max(drag.fromPx, drag.toPx), drag.floorPx) - dragLeft
    : 0
  const dragLabel =
    drag && dragWidth >= DRAG_PX_THRESHOLD ? spanLabel(axis.segments, dragLeft, dragWidth) : null

  // The live geometry that replaces the stored block during a gesture. There is
  // deliberately no "before" outline: the block itself moves.
  const resizeStartPx = resize ? (resize.edge === 'start' ? resize.edgePx : resize.startPx) : 0
  const resizeEndPx = resize ? (resize.edge === 'end' ? resize.edgePx : resize.endPx) : 0
  const planOverride: PlanOverride | null = resize
    ? { planId: resize.planId, leftPx: resizeStartPx, widthPx: resizeEndPx - resizeStartPx }
    : move
      ? { planId: move.planId, leftPx: move.leftPx, widthPx: move.widthPx }
      : pending

  // An existing plan wears the same from – until label while it is being moved
  // or resized. The start edge is the anchor: it stays put when the end changes,
  // and travels with the block when the whole plan moves.
  const resizeChanged = resize
    ? resize.edgePx !== (resize.edge === 'start' ? resize.startPx : resize.endPx)
    : false
  const updateLabel = resize
    ? resizeChanged
      ? spanLabel(axis.segments, resizeStartPx, resizeEndPx - resizeStartPx)
      : null
    : move?.moved
      ? spanLabel(axis.segments, move.leftPx, move.widthPx)
      : null
  const updateLabelLeftPx = resize ? resizeStartPx : (move?.leftPx ?? 0)

  // The from – until label for the plan a resting pointer sits on. Suppressed
  // for the whole of a gesture, which already carries its own live label, and
  // follows the committed geometry while a released block waits for the read.
  const hoveredBlock =
    !drag && !resize && !move && hoveredPlanId != null
      ? (row?.planBlocks.find((block) => block.id === hoveredPlanId) ?? null)
      : null
  const hoveredGeometry =
    hoveredBlock && pending?.planId === hoveredBlock.id
      ? { leftPx: pending.leftPx, widthPx: pending.widthPx }
      : hoveredBlock
        ? { leftPx: hoveredBlock.startPx, widthPx: hoveredBlock.endPx - hoveredBlock.startPx }
        : null
  const hoverLabel = hoveredGeometry
    ? spanLabel(axis.segments, hoveredGeometry.leftPx, hoveredGeometry.widthPx)
    : null
  const hoverLabelLeftPx = hoveredGeometry?.leftPx ?? 0

  // The time a click or drag at the pointer would start on: the same floor and
  // quarter-hour snap the planning gestures use. Nothing to read in the past,
  // over a plan, or mid-gesture — each of those already means no new plan
  // starts here, and the gesture or hover label owns the readout.
  const cursorFloorPx = planFloorPx(axis.segments, now)
  const cursorSnappedPx =
    cursorPx != null && cursorPx >= cursorFloorPx
      ? snapPx(axis.segments, cursorPx, cursorFloorPx)
      : null
  const cursorMinute = cursorSnappedPx == null ? null : pxToMinute(axis.segments, cursorSnappedPx)
  const cursorLabel =
    cursorMinute != null && !drag && !resize && !move && hoveredPlanId == null
      ? formatClock(Math.round(cursorMinute))
      : null
  const cursorLabelLeftPx =
    cursorPx == null
      ? 0
      : Math.max(CURSOR_LABEL_EDGE_PX, Math.min(cursorPx, axis.widthPx - CURSOR_LABEL_EDGE_PX))

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
        {/* your lane — the taller hero track, and the drag-to-plan surface.
            Your name, live dot and tail live in the pinned name cell, not here;
            the empty band above the track is reserved for done-task and session
            titles. Without a signed-in row the bar degrades to the hour strip. */}
        {row && (
          <div className="h-[5.5rem] pt-8">
            <div
              className="cursor-crosshair relative select-none"
              onPointerDown={onLanePointerDown}
              onPointerMove={onLanePointerMove}
              onPointerUp={onLanePointerUp}
              onPointerCancel={() => setDrag(null)}
              onPointerLeave={() => {
                setHoveredPlanId(null)
                setCursorPx(null)
              }}
              onDoubleClick={onLaneDoubleClick}
            >
              <RowTrack row={row} planOverride={planOverride} onSessionClick={onSessionClick} />
              {onPlanUpdate &&
                row.planBlocks.map((block) => (
                  <span
                    key={`${block.id}-body`}
                    onPointerDown={(event) => startMove(event, block)}
                    onPointerMove={onMoveMove}
                    onPointerUp={onMoveUp}
                    onPointerCancel={() => setMove(null)}
                    className="absolute top-0 bottom-0 z-[3] cursor-grab active:cursor-grabbing"
                    style={{ left: block.startPx, width: block.endPx - block.startPx }}
                  />
                ))}
              {onPlanUpdate &&
                row.planBlocks.map((block) => (
                  <Fragment key={block.id}>
                    {(['start', 'end'] as const).map((edge) => (
                      <span
                        key={edge}
                        role="separator"
                        aria-label={`Resize plan ${edge}`}
                        onPointerDown={(event) => startResize(event, block, edge)}
                        onPointerMove={onResizeMove}
                        onPointerUp={onResizeUp}
                        onPointerCancel={() => setResize(null)}
                        className="absolute top-0 bottom-0 z-[4] w-2 -translate-x-1/2 cursor-ew-resize rounded-full hover:bg-primary/25"
                        style={{ left: edge === 'start' ? block.startPx : block.endPx }}
                      />
                    ))}
                  </Fragment>
                ))}
              {drag && dragWidth >= DRAG_PX_THRESHOLD && (
                <div
                  className="border-primary/55 bg-primary/10 pointer-events-none absolute inset-y-0 rounded-[2px] border border-dashed"
                  style={{ left: dragLeft, width: dragWidth }}
                />
              )}
              {dragLabel && <PlanSpanLabel leftPx={dragLeft} label={dragLabel} />}
              {updateLabel && <PlanSpanLabel leftPx={updateLabelLeftPx} label={updateLabel} />}
              {hoverLabel && <PlanSpanLabel leftPx={hoverLabelLeftPx} label={hoverLabel} />}
              {cursorLabel && <CursorTimeLabel leftPx={cursorLabelLeftPx} label={cursorLabel} />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
