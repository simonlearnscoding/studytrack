import { v, type Infer } from 'convex/values'
import type { Id } from '../_generated/dataModel'

// One plan's whole window, supplied by the caller. `dayStart` is the Europe/Zurich
// Day the plan belongs to; the two instants must sit inside it and on the
// 15-minute grid the drag snaps to.
export const createPlanArgs = v.object({
  dayStart: v.number(),
  plannedStart: v.number(),
  plannedEnd: v.number(),
})
export type CreatePlanArgs = Infer<typeof createPlanArgs>

// Resize one edge of an existing plan. The Day comes from the stored row, never
// from the caller, so a plan cannot be moved across Days.
export const updatePlanArgs = v.object({
  planId: v.id('plannedSession'),
  plannedStart: v.number(),
  plannedEnd: v.number(),
})
export type UpdatePlanArgs = Infer<typeof updatePlanArgs>

export const listMyPlansArgs = v.object({ dayStart: v.number() })
export type ListMyPlansArgs = Infer<typeof listMyPlansArgs>

export const removePlanArgs = v.object({ planId: v.id('plannedSession') })
export type RemovePlanArgs = Infer<typeof removePlanArgs>

// The owner's view of a planned session. Not a Session: there is no voice
// evidence and no partials, only the window the member pencilled in.
export type PlannedSession = {
  id: Id<'plannedSession'>
  userId: Id<'users'>
  dayStart: number
  plannedStart: number
  plannedEnd: number
}
