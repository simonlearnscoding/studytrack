import type { TimelinePlanBlockVM, TimelineSegment } from './types'
import { minuteToPx, pxToMinute } from './util'

// Planning snaps to 15-minute marks — the dashed preview, the reported span and
// the gridlines it aims at all share this grain (LD-6 leans 15).
const SNAP_MIN = 15

// Which part of a plan a gesture holds: the whole block, or one of its ends.
export type PlanEdge = 'move' | 'start' | 'end'

// One plan gesture's resolved geometry: where the block sits on the axis and
// which minutes it covers. Minutes are whole — the mutations store minutes.
export type PlanSpan = {
  leftPx: number
  widthPx: number
  startMin: number
  endMin: number
}

// The plan a pixel sits on, if any. Half-open, so a new plan can start exactly
// where the previous one ends.
export function planAt(blocks: TimelinePlanBlockVM[], px: number): TimelinePlanBlockVM | null {
  return blocks.find((block) => px >= block.startPx && px < block.endPx) ?? null
}

// The quarter-hour a new plan would start on at this pixel: the past wall and
// the 15-minute grid applied to it, or null when no plan can start here —
// inside a collapsed band, before now's quarter-hour, or on top of an existing
// plan. `nowPx` is the now the gesture plans against; callers freeze it when a
// gesture starts so a ticking clock cannot drift it mid-drag.
export function resolvePlanStart({
  segments,
  px,
  nowPx,
  blocks,
}: {
  segments: TimelineSegment[]
  px: number
  nowPx: number
  blocks: TimelinePlanBlockVM[]
}): { startPx: number; startMin: number } | null {
  const floorPx = planFloorPx(segments, nowPx)
  if (px < floorPx) return null
  const startPx = snapPx(segments, px, floorPx)
  if (planAt(blocks, startPx)) return null
  const minute = pxToMinute(segments, startPx)
  if (minute == null) return null
  return { startPx, startMin: Math.round(minute) }
}

// Drag-to-create: the span a drag from `fromPx` to `toPx` would make — both ends
// snapped to the grid and stopped at the past wall and the neighbouring plans.
// Null when either end falls into a collapsed band (there is no grid there).
export function resolvePlanDraft({
  segments,
  axisWidthPx,
  blocks,
  fromPx,
  toPx,
  nowPx,
}: {
  segments: TimelineSegment[]
  axisWidthPx: number
  blocks: TimelinePlanBlockVM[]
  fromPx: number
  toPx: number
  nowPx: number
}): PlanSpan | null {
  const floorPx = planFloorPx(segments, nowPx)
  const to = clampToPlans(toPx, fromPx, floorPx, axisWidthPx, blocks)
  const leftPx = snapPx(segments, Math.min(fromPx, to), floorPx)
  const rightPx = snapPx(segments, Math.max(fromPx, to), floorPx)
  return spanAt(segments, leftPx, rightPx - leftPx)
}

// Move or resize one existing plan. `edge` says which part the gesture holds.
// The walls are the past floor and the neighbouring plans (the gesture's own
// block excluded). Null when the gesture has no legal geometry: the block is
// gone or has no width, or the walls have crossed.
export function resolvePlanEdit({
  segments,
  axisWidthPx,
  blocks,
  planId,
  edge,
  pointerPx,
  grabPx,
  nowPx,
}: {
  segments: TimelineSegment[]
  axisWidthPx: number
  blocks: TimelinePlanBlockVM[]
  planId: TimelinePlanBlockVM['id']
  edge: PlanEdge
  pointerPx: number
  grabPx?: number
  nowPx: number
}): PlanSpan | null {
  const block = blocks.find((candidate) => candidate.id === planId)
  if (!block) return null
  const width = block.endPx - block.startPx
  if (width <= 0) return null

  const floorPx = planFloorPx(segments, nowPx)
  const { previousEndPx, nextStartPx } = neighbourWalls(blocks, block, axisWidthPx)

  if (edge === 'move') {
    if (grabPx == null) return null
    const minLeftPx = Math.max(floorPx, previousEndPx)
    const maxLeftPx = Math.min(axisWidthPx - width, nextStartPx - width)
    if (maxLeftPx < minLeftPx) return null
    const snapped = snapPx(segments, block.startPx + (pointerPx - grabPx), 0)
    const leftPx = Math.max(minLeftPx, Math.min(snapped, maxLeftPx))
    return spanAt(segments, leftPx, width)
  }

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
// ends, so a lone plan is free across the whole track.
function neighbourWalls(
  blocks: TimelinePlanBlockVM[],
  block: TimelinePlanBlockVM,
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

// A pixel span → a whole-minute span, or null when either end is hidden in a
// collapsed band.
function spanAt(segments: TimelineSegment[], leftPx: number, widthPx: number): PlanSpan | null {
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
function clampToPlans(
  px: number,
  fromPx: number,
  floorPx: number,
  axisWidthPx: number,
  blocks: TimelinePlanBlockVM[]
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
