import type { TimelinePlanBlockWallVM, TimelineSegment } from './types'
import { minuteToPx, pxToMinute } from './util'

// Planning snaps to 15-minute marks — the dashed preview, the reported span and
// the gridlines it aims at all share this grain (LD-6 leans 15).
const SNAP_MIN = 15

// Which part of a plan a gesture holds: the whole block, or one of its ends.
export type PlanBlockEdge = 'move' | 'start' | 'end'

// One plan gesture's resolved geometry: where the block sits on the axis and
// which minutes it covers. Minutes are whole — the mutations store minutes.
export type PlanBlockSpan = {
  leftPx: number
  widthPx: number
  startMin: number
  endMin: number
}

// The plan a pixel sits on, if any. Half-open, so a new plan can start exactly
// where the previous one ends.
export function planBlockAt(
  blocks: TimelinePlanBlockWallVM[],
  px: number
): TimelinePlanBlockWallVM | null {
  return blocks.find((block) => px >= block.startPx && px < block.endPx) ?? null
}

// The quarter-hour a new plan would start on at this pixel: the past wall and
// the 15-minute grid applied to it, or null when no plan can start here —
// inside a collapsed band, before now's quarter-hour, or on top of an existing
// plan. `nowPx` is the now the gesture plans against; callers freeze it when a
// gesture starts so a ticking clock cannot drift it mid-drag.
export function resolvePlanBlockStart({
  segments,
  px,
  nowPx,
  blocks,
}: {
  segments: TimelineSegment[]
  px: number
  nowPx: number
  blocks: TimelinePlanBlockWallVM[]
}): { startPx: number; startMin: number } | null {
  const floorPx = planFloorPx(segments, nowPx)
  if (px < floorPx) return null
  const startPx = snapPx(segments, px, floorPx)
  if (planBlockAt(blocks, startPx)) return null
  const minute = pxToMinute(segments, startPx)
  if (minute == null) return null
  return { startPx, startMin: Math.round(minute) }
}

// Drag-to-create: the span a drag from `fromPx` to `toPx` would make — both ends
// snapped to the grid and stopped at the past wall and the neighbouring plans.
// Null when either end falls into a collapsed band (there is no grid there).
export function resolvePlanBlockDraft({
  segments,
  axisWidthPx,
  blocks,
  fromPx,
  toPx,
  nowPx,
}: {
  segments: TimelineSegment[]
  axisWidthPx: number
  blocks: TimelinePlanBlockWallVM[]
  fromPx: number
  toPx: number
  nowPx: number
}): PlanBlockSpan | null {
  const floorPx = planFloorPx(segments, nowPx)
  const to = clampToPlanBlocks(toPx, fromPx, floorPx, axisWidthPx, blocks)
  const leftPx = snapPx(segments, Math.min(fromPx, to), floorPx)
  const rightPx = snapPx(segments, Math.max(fromPx, to), floorPx)
  return spanAt(segments, leftPx, rightPx - leftPx)
}

// Move or resize one existing plan. `edge` says which part the gesture holds.
// Both gestures are walled by the past floor and by the plans around the block
// (the gesture's own excluded), so a plan never covers another one. A move may
// still pass over a neighbouring plan into a free gap beyond it; a resize stops
// at the wall, since an edge cannot hop over a block it would swallow. Null when
// the gesture has no legal geometry: the block is gone or has no width, no free
// gap fits it, or the resize walls have crossed.
export function resolvePlanBlockEdit({
  segments,
  axisWidthPx,
  blocks,
  planBlockId,
  edge,
  pointerPx,
  grabPx,
  nowPx,
}: {
  segments: TimelineSegment[]
  axisWidthPx: number
  blocks: TimelinePlanBlockWallVM[]
  planBlockId: TimelinePlanBlockWallVM['id']
  edge: PlanBlockEdge
  pointerPx: number
  grabPx?: number
  nowPx: number
}): PlanBlockSpan | null {
  const block = blocks.find((candidate) => candidate.id === planBlockId)
  if (!block) return null
  const width = block.endPx - block.startPx
  if (width <= 0) return null

  const floorPx = planFloorPx(segments, nowPx)

  if (edge === 'move') {
    if (grabPx == null) return null
    const desiredPx = snapPx(segments, block.startPx + (pointerPx - grabPx), 0)
    const leftPx = nearestFreeLeftPx(blocks, block, width, floorPx, axisWidthPx, desiredPx)
    return leftPx === null ? null : spanAt(segments, leftPx, width)
  }

  const { previousEndPx, nextStartPx } = neighbourWalls(blocks, block, axisWidthPx)

  // Resizing keeps at least one snap step of plan: the moving edge may not
  // cross the fixed one.
  const stepPx = snapStepPx(segments, block.startPx)
  if (stepPx <= 0) return null
  const minPx = edge === 'start' ? Math.max(floorPx, previousEndPx) : block.startPx + stepPx
  const maxPx = edge === 'end' ? Math.min(axisWidthPx, nextStartPx) : block.endPx - stepPx
  if (maxPx <= minPx) return null
  const snapped = snapPx(segments, pointerPx, 0)
  const edgePx = Math.max(minPx, Math.min(snapped, maxPx))
  const leftPx = edge === 'start' ? edgePx : block.startPx
  const rightPx = edge === 'end' ? edgePx : block.endPx
  return spanAt(segments, leftPx, rightPx - leftPx)
}

// The earliest pixel a plan may start: the first 15-minute mark at and after
// "now". A plan never contains a past minute (LD-6), so this is the wall both
// the snapped preview and the reported span stop at.
function planFloorPx(segments: TimelineSegment[], nowPx: number): number {
  const nowMin = pxToMinute(segments, nowPx)
  if (nowMin == null) return nowPx
  const floorMin = Math.ceil(nowMin / SNAP_MIN) * SNAP_MIN
  return minuteToPx(segments, floorMin) ?? nowPx
}

// Snap an axis pixel to the nearest 15-minute boundary, still in pixels:
// px → minute → snap → px. Raw pixels (and band-hidden positions) pass through.
// Never lands left of `floorPx`: dragging back is refused, exactly like the snap.
function snapPx(segments: TimelineSegment[], px: number, floorPx: number): number {
  const minute = pxToMinute(segments, px)
  if (minute == null) return px
  const snapped = Math.round(minute / SNAP_MIN) * SNAP_MIN
  return Math.max(minuteToPx(segments, snapped) ?? px, floorPx)
}

// One 15-minute step in pixels at this point on the axis.
function snapStepPx(segments: TimelineSegment[], px: number): number {
  const minute = pxToMinute(segments, px)
  if (minute == null) return 0
  const from = minuteToPx(segments, minute)
  const to = minuteToPx(segments, minute + SNAP_MIN)
  return from === null || to === null ? 0 : to - from
}

// The pixel walls a block's neighbours put on it: the nearest end of a plan
// before it, and the nearest start of a plan after it. Defaults are the axis
// ends, so a lone plan is free across the whole track. A move does not use these
// — it may pass a neighbour; a resize, which cannot, does.
function neighbourWalls(
  blocks: TimelinePlanBlockWallVM[],
  block: TimelinePlanBlockWallVM,
  axisWidthPx: number
): { previousEndPx: number; nextStartPx: number } {
  const others = blocks.filter((other) => other.id !== block.id)
  return {
    previousEndPx: others
      .filter((other) => other.endPx <= block.startPx)
      .reduce((nearest, other) => Math.max(nearest, other.endPx), 0),
    nextStartPx: others
      .filter((other) => other.startPx >= block.endPx)
      .reduce((nearest, other) => Math.min(nearest, other.startPx), axisWidthPx),
  }
}

// Where a block of this width may start without covering another plan: one
// range of left pixels per free gap, in axis order, clamped to the past floor
// and the axis end. A gap narrower than the block contributes no range, so a
// plan that fits nowhere has nowhere to go.
function freeLeftRanges(
  blocks: TimelinePlanBlockWallVM[],
  block: TimelinePlanBlockWallVM,
  widthPx: number,
  floorPx: number,
  axisWidthPx: number
): { fromPx: number; toPx: number }[] {
  const ranges: { fromPx: number; toPx: number }[] = []
  let gapStartPx = Math.max(floorPx, 0)
  const walls = blocks
    .filter((other) => other.id !== block.id)
    .sort((left, right) => left.startPx - right.startPx)
  for (const wall of walls) {
    ranges.push({ fromPx: gapStartPx, toPx: wall.startPx - widthPx })
    gapStartPx = Math.max(gapStartPx, wall.endPx)
  }
  ranges.push({ fromPx: gapStartPx, toPx: axisWidthPx - widthPx })
  return ranges.filter((range) => range.toPx >= range.fromPx)
}

// The legal left nearest where the pointer asked for. A drag therefore hops over
// a neighbouring plan once it has travelled past that plan's middle — the block
// reorders instead of piling up against the neighbour's edge — and lands flush
// inside the gap it can actually fit.
function nearestFreeLeftPx(
  blocks: TimelinePlanBlockWallVM[],
  block: TimelinePlanBlockWallVM,
  widthPx: number,
  floorPx: number,
  axisWidthPx: number,
  desiredPx: number
): number | null {
  let nearest: { leftPx: number; distancePx: number } | null = null
  for (const range of freeLeftRanges(blocks, block, widthPx, floorPx, axisWidthPx)) {
    const leftPx = Math.max(range.fromPx, Math.min(desiredPx, range.toPx))
    const distancePx = Math.abs(leftPx - desiredPx)
    if (nearest === null || distancePx < nearest.distancePx) nearest = { leftPx, distancePx }
  }
  return nearest?.leftPx ?? null
}

// A pixel span → a whole-minute span, or null when either end is hidden in a
// collapsed band.
function spanAt(
  segments: TimelineSegment[],
  leftPx: number,
  widthPx: number
): PlanBlockSpan | null {
  const startMin = pxToMinute(segments, leftPx)
  const endMin = pxToMinute(segments, leftPx + widthPx)
  if (startMin == null || endMin == null) return null
  return {
    leftPx,
    widthPx,
    startMin: Math.round(startMin),
    endMin: Math.round(endMin),
  }
}

// Stop a drag at the next plan in the direction of travel, and never let it go
// left of the past wall. The from-pixel is always outside a plan (pointer-down
// rejects that), so only the blocks ahead of it can be walls.
function clampToPlanBlocks(
  px: number,
  fromPx: number,
  floorPx: number,
  axisWidthPx: number,
  blocks: TimelinePlanBlockWallVM[]
): number {
  if (px >= fromPx) {
    const wall = blocks
      .filter((block) => block.startPx >= fromPx)
      .reduce((nearest, block) => Math.min(nearest, block.startPx), axisWidthPx)
    return Math.min(Math.max(px, floorPx), axisWidthPx, wall)
  }

  const wall = blocks
    .filter((block) => block.endPx <= fromPx)
    .reduce((nearest, block) => Math.max(nearest, block.endPx), floorPx)
  return Math.max(Math.min(px, axisWidthPx), floorPx, wall)
}
