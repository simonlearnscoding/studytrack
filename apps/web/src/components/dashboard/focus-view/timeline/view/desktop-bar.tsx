import type {
  TimelinePlanBlockVM,
  TimelineRowVM,
  TimelineWindow,
} from '@studytrack/backend/convex/timeline/types'
import {
  planAt,
  resolvePlanDraft,
  resolvePlanEdit,
  resolvePlanStart,
  type PlanSpan,
} from '@studytrack/backend/convex/timeline/gesture'
import { formatClock, pxToMinute } from '@studytrack/backend/convex/timeline/util'
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
import { RowTrack, type PlanOverride, type SessionClick } from './row-track'
import type { AxisSurface } from '../types'
import { useMirrorScroll } from '../hooks/use-mirror-scroll'

// A drag shorter than this is a click, not a plan.
const DRAG_PX_THRESHOLD = 4
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

type MoveGesture = {
  kind: 'move'
  planId: TimelinePlanBlockVM['id']
  grabPx: number
  blocks: TimelinePlanBlockVM[]
  nowPx: number
  span: PlanSpan
  moved: boolean
}

type ResizeGesture = {
  kind: 'resize'
  planId: TimelinePlanBlockVM['id']
  edge: 'start' | 'end'
  blocks: TimelinePlanBlockVM[]
  nowPx: number
  span: PlanSpan
}

// The gesture in flight. Both the geometry and its input snapshot live here, so
// a live query update cannot move the walls mid-drag and the render reads one
// resolved span instead of re-deriving pixels.
type PlanGesture = MoveGesture | ResizeGesture

// The from – until label a resolved span wears. Gestures and the resting
// pointer all route through this, so the times read the same whichever is in
// flight.
function spanText(span: PlanSpan): string {
  return `${formatClock(span.startMin)} – ${formatClock(span.endMin)}`
}

// The same label for a stored block, whose geometry is pixels only.
function blockSpanText(
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
//
// The gesture geometry itself — the quarter-hour grid, the past wall, the plan
// neighbours, the start/end caps — lives in the timeline pure seam
// (`resolvePlanStart`, `resolvePlanDraft`, `resolvePlanEdit`). This module only
// owns the pointer state and the pixels' presentation.
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

  // The drag-to-plan selection, in axis pixels. `nowPx` is the past wall,
  // captured when the gesture starts so a ticking clock cannot drift it
  // mid-drag.
  const [drag, setDrag] = useState<{ fromPx: number; toPx: number; nowPx: number } | null>(null)

  // The plan gesture in flight: which plan, which part, and the geometry the
  // pure seam last resolved. `blocks` and `nowPx` are the snapshot the walls
  // are computed from.
  const [edit, setEdit] = useState<PlanGesture | null>(null)

  // Committed geometry held on screen until the live read catches up, so a
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
    const start = resolvePlanStart({
      segments: axis.segments,
      px: fromPx,
      nowPx: now,
      blocks: row?.planBlocks ?? [],
    })
    // A gesture that begins in the past, or on top of an existing plan, plans
    // nothing at all: both walls are hard at the start.
    if (!start) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ fromPx, toPx: fromPx, nowPx: now })
  }

  const onLanePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointerPx = lanePx(event)
    setCursorPx(pointerPx)
    setHoveredPlanId(planAt(row?.planBlocks ?? [], pointerPx)?.id ?? null)
    if (!drag) return
    if (drag.toPx === pointerPx) return
    setDrag({ ...drag, toPx: pointerPx })
  }

  const onLanePointerUp = () => {
    if (drag) {
      const span = resolvePlanDraft({
        segments: axis.segments,
        axisWidthPx: axis.widthPx,
        blocks: row?.planBlocks ?? [],
        fromPx: drag.fromPx,
        toPx: drag.toPx,
        nowPx: drag.nowPx,
      })
      if (span && span.widthPx >= DRAG_PX_THRESHOLD) {
        onPlanDrag?.({ startMin: span.startMin, endMin: span.endMin })
      }
    }
    setDrag(null)
  }

  // Double-click the empty future lane for a two-hour plan snapped to the same
  // quarter-hour grid as a drag. Start on a plan or in the past plans nothing.
  const onLaneDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const start = resolvePlanStart({
      segments: axis.segments,
      px: lanePx(event),
      nowPx: now,
      blocks: row?.planBlocks ?? [],
    })
    if (!start) return
    onPlanDoubleClick?.({
      startMin: start.startMin,
      endMin: start.startMin + DOUBLE_CLICK_PLAN_MIN,
    })
  }

  // Start moving a whole block. Duration and walls are the seam's job; the
  // snapshot of the blocks freezes them for the gesture.
  const startMove = (event: ReactPointerEvent<HTMLSpanElement>, block: TimelinePlanBlockVM) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    event.stopPropagation()
    const grabPx = lanePx(event)
    const blocks = row?.planBlocks ?? []
    const span = resolvePlanEdit({
      segments: axis.segments,
      axisWidthPx: axis.widthPx,
      blocks,
      planId: block.id,
      edge: 'move',
      pointerPx: grabPx,
      grabPx,
      nowPx: now,
    })
    if (!span) return
    setPending(null)
    event.currentTarget.setPointerCapture(event.pointerId)
    setEdit({ kind: 'move', planId: block.id, grabPx, blocks, nowPx: now, span, moved: false })
  }

  const onMoveMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (edit?.kind !== 'move') return
    const pointerPx = lanePx(event)
    const span = resolvePlanEdit({
      segments: axis.segments,
      axisWidthPx: axis.widthPx,
      blocks: edit.blocks,
      planId: edit.planId,
      edge: 'move',
      pointerPx,
      grabPx: edit.grabPx,
      nowPx: edit.nowPx,
    })
    if (!span) return
    const moved = edit.moved || Math.abs(pointerPx - edit.grabPx) >= DRAG_PX_THRESHOLD
    if (span.leftPx === edit.span.leftPx && moved === edit.moved) return
    setEdit({ ...edit, span, moved })
  }

  const onMoveUp = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (edit?.kind === 'move') {
      if (edit.moved) {
        setPending({ planId: edit.planId, leftPx: edit.span.leftPx, widthPx: edit.span.widthPx })
        onPlanUpdate?.({
          planId: edit.planId,
          startMin: edit.span.startMin,
          endMin: edit.span.endMin,
        })
      } else {
        // A press-and-release under the drag threshold is a click, not a move.
        onPlanClick?.({
          planId: edit.planId,
          startMin: edit.span.startMin,
          endMin: edit.span.endMin,
          x: event.clientX,
          y: event.clientY,
        })
      }
    }
    setEdit(null)
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
    const blocks = row?.planBlocks ?? []
    const span = resolvePlanEdit({
      segments: axis.segments,
      axisWidthPx: axis.widthPx,
      blocks,
      planId: block.id,
      edge,
      pointerPx: lanePx(event),
      nowPx: now,
    })
    if (!span) return
    setPending(null)
    event.currentTarget.setPointerCapture(event.pointerId)
    setEdit({ kind: 'resize', planId: block.id, edge, blocks, nowPx: now, span })
  }

  const onResizeMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (edit?.kind !== 'resize') return
    const span = resolvePlanEdit({
      segments: axis.segments,
      axisWidthPx: axis.widthPx,
      blocks: edit.blocks,
      planId: edit.planId,
      edge: edit.edge,
      pointerPx: lanePx(event),
      nowPx: edit.nowPx,
    })
    if (!span) return
    if (span.leftPx === edit.span.leftPx && span.widthPx === edit.span.widthPx) return
    setEdit({ ...edit, span })
  }

  const onResizeUp = () => {
    if (edit?.kind === 'resize') {
      const block = edit.blocks.find((candidate) => candidate.id === edit.planId)
      const changed =
        block != null &&
        (edit.span.leftPx !== block.startPx || edit.span.widthPx !== block.endPx - block.startPx)
      if (changed) {
        setPending({ planId: edit.planId, leftPx: edit.span.leftPx, widthPx: edit.span.widthPx })
        onPlanUpdate?.({
          planId: edit.planId,
          startMin: edit.span.startMin,
          endMin: edit.span.endMin,
        })
      }
    }
    setEdit(null)
  }

  // The preview snaps live, so the dashed block always sits on the grid — and
  // parks against the floor rather than sliding into the past.
  const draft = drag
    ? resolvePlanDraft({
        segments: axis.segments,
        axisWidthPx: axis.widthPx,
        blocks: row?.planBlocks ?? [],
        fromPx: drag.fromPx,
        toPx: drag.toPx,
        nowPx: drag.nowPx,
      })
    : null
  const dragLeft = draft?.leftPx ?? 0
  const dragWidth = draft?.widthPx ?? 0
  const dragLabel = draft && dragWidth >= DRAG_PX_THRESHOLD ? spanText(draft) : null

  // The live geometry that replaces the stored block during a gesture. There is
  // deliberately no "before" outline: the block itself moves.
  const planOverride: PlanOverride | null = edit
    ? { planId: edit.planId, leftPx: edit.span.leftPx, widthPx: edit.span.widthPx }
    : pending

  // An existing plan wears the same from – until label while it is being moved
  // or resized. The start edge is the anchor: it stays put when the end changes,
  // and travels with the block when the whole plan moves.
  const editBlock = edit ? edit.blocks.find((block) => block.id === edit.planId) : null
  const editChanged =
    edit?.kind === 'move'
      ? edit.moved
      : editBlock != null &&
        edit != null &&
        (edit.span.leftPx !== editBlock.startPx ||
          edit.span.widthPx !== editBlock.endPx - editBlock.startPx)
  const editLabel = edit && editChanged ? spanText(edit.span) : null
  const editLabelLeftPx = edit?.span.leftPx ?? 0

  // The from – until label for the plan a resting pointer sits on. Suppressed
  // for the whole of a gesture, which already carries its own live label, and
  // follows the committed geometry while a released block waits for the read.
  const hoveredBlock =
    !drag && !edit && hoveredPlanId != null
      ? (row?.planBlocks.find((block) => block.id === hoveredPlanId) ?? null)
      : null
  const hoveredGeometry =
    hoveredBlock && pending?.planId === hoveredBlock.id
      ? { leftPx: pending.leftPx, widthPx: pending.widthPx }
      : hoveredBlock
        ? { leftPx: hoveredBlock.startPx, widthPx: hoveredBlock.endPx - hoveredBlock.startPx }
        : null
  const hoverLabel = hoveredGeometry
    ? blockSpanText(axis.segments, hoveredGeometry.leftPx, hoveredGeometry.widthPx)
    : null
  const hoverLabelLeftPx = hoveredGeometry?.leftPx ?? 0

  // The time a click or drag at the pointer would start on: the same floor and
  // quarter-hour snap the planning gestures use. Nothing to read in the past,
  // over a plan, or mid-gesture — each of those already means no new plan
  // starts here, and the gesture or hover label owns the readout.
  const cursorStart =
    cursorPx != null
      ? resolvePlanStart({
          segments: axis.segments,
          px: cursorPx,
          nowPx: now,
          blocks: row?.planBlocks ?? [],
        })
      : null
  const cursorLabel =
    cursorStart && !drag && !edit && hoveredPlanId == null
      ? formatClock(cursorStart.startMin)
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
                    onPointerCancel={() => setEdit(null)}
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
                        onPointerCancel={() => setEdit(null)}
                        className="absolute top-0 bottom-0 z-[4] w-2 -translate-x-1/2 cursor-ew-resize rounded-full hover:bg-primary/25"
                        style={{ left: edge === 'start' ? block.startPx : block.endPx }}
                      />
                    ))}
                  </Fragment>
                ))}
              {drag && dragWidth >= DRAG_PX_THRESHOLD && (
                <div
                  className="border-primary/55 bg-primary/10 pointer-events-none absolute inset-y-0 border border-dashed"
                  style={{ left: dragLeft, width: dragWidth }}
                />
              )}
              {dragLabel && <PlanSpanLabel leftPx={dragLeft} label={dragLabel} />}
              {editLabel && <PlanSpanLabel leftPx={editLabelLeftPx} label={editLabel} />}
              {hoverLabel && <PlanSpanLabel leftPx={hoverLabelLeftPx} label={hoverLabel} />}
              {cursorLabel && <CursorTimeLabel leftPx={cursorLabelLeftPx} label={cursorLabel} />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
