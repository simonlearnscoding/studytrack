import {
  resolvePlanBlockDraft,
  resolvePlanBlockStart,
} from '@studytrack/backend/convex/timeline/gesture'
import type { TimelineRowVM } from '@studytrack/backend/convex/timeline/types'
import { formatClock, minuteToPx } from '@studytrack/backend/convex/timeline/util'
import { Fragment, type RefObject } from 'react'
import { HourLabels, NowLine, NowPill } from '../axis/markers'
import { BandLayer } from '../axis/night-band'
import { RowTrack, type PlanBlockOverride, type WorkSessionClick } from '../lanes/row-track'
import type { AxisSurface } from '../../types'
import { useMirrorScroll } from '../../hooks/use-mirror-scroll'
import { blockSpanText, planBlockSpanText } from './plan-block-label-text'
import { CursorTimeLabel, PlanBlockSpanLabel } from './plan-block-labels'
import { isPlannableSpan, usePlanBlockGestures } from './use-plan-block-gestures'
import type { PlanBlockClick, PlanBlockDraft, PlanBlockDrag, PlanBlockUpdate } from './types'

// Keeps the cursor readout fully on the axis when the pointer nears an edge.
const CURSOR_LABEL_EDGE_PX = 28

// All the drawing helpers live in the sibling modules:
//   types.ts            — the gesture and callback shapes
//   use-plan-block-gestures.ts — pointer state, drag/move/resize, hover and cursor
//   plan-block-labels.tsx     — the from – until and cursor chips
export type { PlanBlockClick, PlanBlockDraft, PlanBlockDrag, PlanBlockUpdate } from './types'

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
// live and opens the draft popover on release. A double-click on empty future
// lane does the same with a two-hour window. Planning is future-only — the
// preview refuses to snap back past now's quarter-hour, and a drag or
// double-click that begins before now plans nothing. Mobile plans by tap
// instead — see the pinned mobile lane.
//
// The gesture geometry itself — the quarter-hour grid, the past wall, the plan
// neighbours, the start/end caps — lives in the timeline pure seam
// (`resolvePlanBlockStart`, `resolvePlanBlockDraft`, `resolvePlanBlockEdit`). The hook owns the
// pointer state; this component owns the pixels.
export function PinnedDesktopBar({
  surface: { axis, bands, hidden, isNightBandHeldOpen, onToggleBand },
  row,
  nowLabel,
  scrollerRef,
  draftPlanBlock,
  onPlanBlockDrag,
  onPlanBlockDoubleClick,
  onPlanBlockUpdate,
  onPlanBlockClick,
  onWorkSessionClick,
}: {
  surface: AxisSurface
  row?: TimelineRowVM
  nowLabel: string
  scrollerRef: RefObject<HTMLDivElement | null>
  // The window of the draft popover, kept drawn on the lane until the member
  // decides; null when no draft is open.
  draftPlanBlock?: PlanBlockDraft | null
  onPlanBlockDrag?: (span: PlanBlockDrag) => void
  onPlanBlockDoubleClick?: (span: PlanBlockDrag) => void
  onPlanBlockUpdate?: (update: PlanBlockUpdate) => void
  onPlanBlockClick?: (click: PlanBlockClick) => void
  onWorkSessionClick?: (click: WorkSessionClick) => void
}) {
  const now = axis.nowPx
  const {
    refs: { mirrorRef, barRef },
    gesture: { dragDraft, edit, pending, hoveredPlanBlockId, cursorPx },
    laneEvents,
    moveEvents,
    resizeEvents,
  } = usePlanBlockGestures({
    axis,
    row,
    scrollerRef,
    onPlanBlockDrag,
    onPlanBlockDoubleClick,
    onPlanBlockUpdate,
    onPlanBlockClick,
  })
  useMirrorScroll(scrollerRef, mirrorRef)

  // The preview snaps live, so the dashed block always sits on the grid — and
  // parks against the floor rather than sliding into the past.
  const dragPreview = dragDraft
    ? resolvePlanBlockDraft({
        segments: axis.segments,
        axisWidthPx: axis.widthPx,
        blocks: row?.planBlockWalls ?? [],
        fromPx: dragDraft.fromPx,
        toPx: dragDraft.toPx,
        nowPx: dragDraft.nowPx,
      })
    : null
  const dragLabel = isPlannableSpan(dragPreview) ? planBlockSpanText(dragPreview) : null

  // The dashed span stays on the lane while its draft popover is open, so the
  // member confirms a block they can still see. `minuteToPx` is null inside a
  // collapsed band, where no plan can start anyway.
  const openDraftLeftPx = draftPlanBlock ? minuteToPx(axis.segments, draftPlanBlock.startMin) : null
  const openDraftEndPx = draftPlanBlock ? minuteToPx(axis.segments, draftPlanBlock.endMin) : null
  const openDraft =
    openDraftLeftPx != null && openDraftEndPx != null
      ? { leftPx: openDraftLeftPx, widthPx: openDraftEndPx - openDraftLeftPx }
      : null

  // The live geometry that replaces the stored block during a gesture. There is
  // deliberately no "before" outline: the block itself moves.
  const planBlockOverride: PlanBlockOverride | null = edit
    ? { planBlockId: edit.planBlockId, leftPx: edit.span.leftPx, widthPx: edit.span.widthPx }
    : pending

  // An existing plan wears the same from – until label while it is being moved
  // or resized. The start edge is the anchor: it stays put when the end changes,
  // and travels with the block when the whole plan moves.
  const editBlock = edit ? edit.blocks.find((block) => block.id === edit.planBlockId) : null
  const editChanged =
    edit?.kind === 'move'
      ? edit.moved
      : editBlock != null &&
        edit != null &&
        (edit.span.leftPx !== editBlock.startPx ||
          edit.span.widthPx !== editBlock.endPx - editBlock.startPx)
  const editLabel = edit && editChanged ? planBlockSpanText(edit.span) : null
  const editLabelLeftPx = edit?.span.leftPx ?? 0

  // The from – until label for the plan a resting pointer sits on. Suppressed
  // for the whole of a gesture, which already carries its own live label, and
  // follows the committed geometry while a released block waits for the read.
  const hoveredBlock =
    !dragDraft && !edit && hoveredPlanBlockId != null
      ? (row?.planBlockWalls.find((block) => block.id === hoveredPlanBlockId) ?? null)
      : null
  const hoveredGeometry =
    hoveredBlock && pending?.planBlockId === hoveredBlock.id
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
      ? resolvePlanBlockStart({
          segments: axis.segments,
          px: cursorPx,
          nowPx: now,
          blocks: row?.planBlockWalls ?? [],
        })
      : null
  const cursorLabel =
    cursorStart && !dragDraft && !edit && hoveredPlanBlockId == null
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
        <BandLayer
          bands={bands}
          hidden={hidden}
          isNightBandHeldOpen={isNightBandHeldOpen}
          onToggle={onToggleBand}
        />
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
            the empty band above the track is reserved for done-task and workSession
            titles. Without a signed-in row the bar degrades to the hour strip. */}
        {row && (
          <div className="h-[5.5rem] pt-8">
            <div className="cursor-crosshair relative select-none" {...laneEvents}>
              <RowTrack
                row={row}
                planBlockOverride={planBlockOverride}
                onWorkSessionClick={onWorkSessionClick}
              />
              {onPlanBlockUpdate &&
                row.planBlockWalls.map((block) => (
                  <span
                    key={`${block.id}-body`}
                    onPointerDown={(event) => moveEvents.start(event, block)}
                    onPointerMove={moveEvents.onPointerMove}
                    onPointerUp={moveEvents.onPointerUp}
                    onPointerCancel={moveEvents.onPointerCancel}
                    className="absolute top-0 bottom-0 z-[3] cursor-grab active:cursor-grabbing"
                    style={{ left: block.startPx, width: block.endPx - block.startPx }}
                  />
                ))}
              {onPlanBlockUpdate &&
                row.planBlockWalls.map((block) => (
                  <Fragment key={block.id}>
                    {(['start', 'end'] as const).map((edge) => (
                      <span
                        key={edge}
                        role="separator"
                        aria-label={`Resize plan ${edge}`}
                        onPointerDown={(event) => resizeEvents.start(event, block, edge)}
                        onPointerMove={resizeEvents.onPointerMove}
                        onPointerUp={resizeEvents.onPointerUp}
                        onPointerCancel={resizeEvents.onPointerCancel}
                        className="absolute top-0 bottom-0 z-[4] w-2 -translate-x-1/2 cursor-ew-resize rounded-full hover:bg-primary/25"
                        style={{ left: edge === 'start' ? block.startPx : block.endPx }}
                      />
                    ))}
                  </Fragment>
                ))}
              {dragLabel && dragPreview && (
                <>
                  <div
                    className="border-primary/55 bg-primary/10 pointer-events-none absolute inset-y-0 border border-dashed"
                    style={{ left: dragPreview.leftPx, width: dragPreview.widthPx }}
                  />
                  <PlanBlockSpanLabel leftPx={dragPreview.leftPx} label={dragLabel} />
                </>
              )}
              {draftPlanBlock && openDraft && (
                <>
                  <div
                    className="border-primary/55 bg-primary/10 pointer-events-none absolute inset-y-0 border border-dashed"
                    style={{ left: openDraft.leftPx, width: openDraft.widthPx }}
                  />
                  <PlanBlockSpanLabel
                    leftPx={openDraft.leftPx}
                    label={planBlockSpanText(draftPlanBlock)}
                  />
                </>
              )}
              {editLabel && <PlanBlockSpanLabel leftPx={editLabelLeftPx} label={editLabel} />}
              {hoverLabel && <PlanBlockSpanLabel leftPx={hoverLabelLeftPx} label={hoverLabel} />}
              {cursorLabel && <CursorTimeLabel leftPx={cursorLabelLeftPx} label={cursorLabel} />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
