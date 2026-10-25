import type { PlanBlockSpan } from '@studytrack/backend/convex/timeline/gesture'
import type { TimelinePlanBlockWallVM } from '@studytrack/backend/convex/timeline/types'

// The window a planning gesture resolves to, before it is committed.
export type PlanBlockDraft = { startMin: number; endMin: number }

// A completed planning gesture: the window it drew, plus the viewport point the
// draft popover anchors to.
export type PlanBlockDrag = PlanBlockDraft & { x: number; y: number }

export type PlanBlockUpdate = {
  planBlockId: TimelinePlanBlockWallVM['id']
  title: TimelinePlanBlockWallVM['title']
  startMin: number
  endMin: number
}

export type PlanBlockClick = PlanBlockUpdate & { x: number; y: number }

type MoveGesture = {
  kind: 'move'
  planBlockId: TimelinePlanBlockWallVM['id']
  grabPx: number
  blocks: TimelinePlanBlockWallVM[]
  nowPx: number
  span: PlanBlockSpan
  moved: boolean
}

type ResizeGesture = {
  kind: 'resize'
  planBlockId: TimelinePlanBlockWallVM['id']
  edge: 'start' | 'end'
  blocks: TimelinePlanBlockWallVM[]
  nowPx: number
  span: PlanBlockSpan
}

// The gesture in flight. Both the geometry and its input snapshot live here, so
// a live query update cannot move the walls mid-drag and the render reads one
// resolved span instead of re-deriving pixels.
export type PlanBlockGesture = MoveGesture | ResizeGesture
