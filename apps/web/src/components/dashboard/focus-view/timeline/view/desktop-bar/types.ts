import type { PlanSpan } from '@studytrack/backend/convex/timeline/gesture'
import type { TimelinePlanBlockVM } from '@studytrack/backend/convex/timeline/types'

// The window a planning gesture resolves to, before it is committed.
export type PlanDraft = { startMin: number; endMin: number }

// A completed planning gesture: the window it drew, plus the viewport point the
// draft popover anchors to.
export type PlanDrag = PlanDraft & { x: number; y: number }

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
export type PlanGesture = MoveGesture | ResizeGesture
