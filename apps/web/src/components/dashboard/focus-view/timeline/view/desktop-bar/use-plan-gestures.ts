import {
  planAt,
  resolvePlanDraft,
  resolvePlanEdit,
  resolvePlanStart,
  type PlanSpan,
} from '@studytrack/backend/convex/timeline/gesture'
import type {
  TimelinePlanBlockVM,
  TimelineRowVM,
  TimelineWindow,
} from '@studytrack/backend/convex/timeline/types'
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import type { PlanOverride } from '../lanes/row-track'
import type { PlanClick, PlanDrag, PlanGesture, PlanUpdate } from './types'

// A drag shorter than this is a click, not a plan.
const DRAG_PX_THRESHOLD = 4
// A double-click on the lane plans a two-hour session at the clicked mark.
const DOUBLE_CLICK_PLAN_MIN = 2 * 60
// How long a released block keeps its committed geometry on screen while the
// live read catches up.
const PENDING_MS = 1200

// The pointer state behind the pinned lane: the draft a drag is drawing, the
// move/resize of a stored plan, and the hover/cursor readouts. The components
// own the pixels; this hook owns the gestures.
export function usePlanGestures({
  axis,
  row,
  scrollerRef,
  onPlanDrag,
  onPlanDoubleClick,
  onPlanUpdate,
  onPlanClick,
}: {
  axis: TimelineWindow
  row?: TimelineRowVM
  scrollerRef: RefObject<HTMLDivElement | null>
  onPlanDrag?: (span: PlanDrag) => void
  onPlanDoubleClick?: (span: PlanDrag) => void
  onPlanUpdate?: (update: PlanUpdate) => void
  onPlanClick?: (click: PlanClick) => void
}) {
  const now = axis.nowPx
  const mirrorRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

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
  const [dragDraft, setDragDraft] = useState<{
    fromPx: number
    toPx: number
    nowPx: number
  } | null>(null)

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
    const timer = setTimeout(() => setPending(null), PENDING_MS)
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
    setDragDraft({ fromPx, toPx: fromPx, nowPx: now })
  }

  const onLanePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointerPx = lanePx(event)
    setCursorPx(pointerPx)
    setHoveredPlanId(planAt(row?.planBlocks ?? [], pointerPx)?.id ?? null)
    if (!dragDraft) return
    if (dragDraft.toPx === pointerPx) return
    setDragDraft({ ...dragDraft, toPx: pointerPx })
  }

  const onLanePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragDraft) return
    const span = resolvePlanDraft({
      segments: axis.segments,
      axisWidthPx: axis.widthPx,
      blocks: row?.planBlocks ?? [],
      fromPx: dragDraft.fromPx,
      toPx: dragDraft.toPx,
      nowPx: dragDraft.nowPx,
    })
    setDragDraft(null)
    if (!isPlannableSpan(span)) return
    onPlanDrag?.({
      startMin: span.startMin,
      endMin: span.endMin,
      x: event.clientX,
      y: event.clientY,
    })
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
      x: event.clientX,
      y: event.clientY,
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
    if (edit?.kind !== 'move') return
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
    if (edit?.kind !== 'resize') return
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
    setEdit(null)
  }

  const onLanePointerCancel = () => setDragDraft(null)
  const onLanePointerLeave = () => {
    setHoveredPlanId(null)
    setCursorPx(null)
  }
  const onMoveCancel = () => setEdit(null)
  const onResizeCancel = () => setEdit(null)

  return {
    mirrorRef,
    barRef,
    dragDraft,
    edit,
    pending,
    hoveredPlanId,
    cursorPx,
    onLanePointerDown,
    onLanePointerMove,
    onLanePointerUp,
    onLanePointerCancel,
    onLanePointerLeave,
    onLaneDoubleClick,
    startMove,
    onMoveMove,
    onMoveUp,
    onMoveCancel,
    startResize,
    onResizeMove,
    onResizeUp,
    onResizeCancel,
  }
}

// A span must exist and be wide enough to read as a drag rather than a click.
export function isPlannableSpan(span: PlanSpan | null): span is PlanSpan {
  return span != null && span.widthPx >= DRAG_PX_THRESHOLD
}
