import { v, type Infer } from 'convex/values'
import type { Id } from '../_generated/dataModel'

// One planBlock's whole window, supplied by the caller. `dayStart` is the
// Europe/Zurich Day the planBlock belongs to; the two instants must sit inside it
// and on the 15-minute grid the drag snaps to.
export const createPlanBlockArgs = v.object({
  dayStart: v.number(),
  plannedStart: v.number(),
  plannedEnd: v.number(),
})
export type CreatePlanBlockArgs = Infer<typeof createPlanBlockArgs>

// Resize one edge of an existing planBlock. The Day comes from the stored row,
// never from the caller, so a planBlock cannot be moved across Days.
export const updatePlanBlockArgs = v.object({
  planBlockId: v.id('planBlock'),
  plannedStart: v.number(),
  plannedEnd: v.number(),
})
export type UpdatePlanBlockArgs = Infer<typeof updatePlanBlockArgs>

export const listMyPlanBlocksArgs = v.object({ dayStart: v.number() })
export type ListMyPlanBlocksArgs = Infer<typeof listMyPlanBlocksArgs>

export const removePlanBlockArgs = v.object({ planBlockId: v.id('planBlock') })
export type RemovePlanBlockArgs = Infer<typeof removePlanBlockArgs>

// The owner's view of a planBlock. Not a workSession: there is no voice evidence
// and no partials, only the window the member pencilled in.
export type PlanBlock = {
  id: Id<'planBlock'>
  userId: Id<'users'>
  dayStart: number
  plannedStart: number
  plannedEnd: number
}
