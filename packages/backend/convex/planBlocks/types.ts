import { v, type Infer } from 'convex/values'
import type { Id } from '../_generated/dataModel'

// One planBlock's whole window, supplied by the caller. `dayStart` is the
// Europe/Zurich Day the planBlock belongs to; the two instants must sit inside it
// and on the 15-minute grid the drag snaps to. `title` is the member's name for
// the block, trimmed by the service; an omitted or blank title leaves the block
// unnamed and the lane falls back to its time range.
export const createPlanBlockArgs = v.object({
  dayStart: v.number(),
  title: v.optional(v.string()),
  plannedStart: v.number(),
  plannedEnd: v.number(),
})
export type CreatePlanBlockArgs = Infer<typeof createPlanBlockArgs>

// Rename one of the caller's planBlocks and, while it has not started, move its
// window. The Day comes from the stored row, never from the caller, so a
// planBlock cannot be moved across Days. A supplied title is trimmed; a blank one
// clears the name, while omitting it (a drag) keeps the stored title.
export const updatePlanBlockArgs = v.object({
  planBlockId: v.id('planBlock'),
  title: v.optional(v.string()),
  plannedStart: v.number(),
  plannedEnd: v.number(),
})
export type UpdatePlanBlockArgs = Infer<typeof updatePlanBlockArgs>

export const listMyPlanBlocksArgs = v.object({ dayStart: v.number() })
export type ListMyPlanBlocksArgs = Infer<typeof listMyPlanBlocksArgs>

export const removePlanBlockArgs = v.object({ planBlockId: v.id('planBlock') })
export type RemovePlanBlockArgs = Infer<typeof removePlanBlockArgs>

// The owner's view of a planBlock. Not a workSession: there is no voice evidence
// and no partials, only the window and name the member pencilled in.
export type PlanBlock = {
  id: Id<'planBlock'>
  userId: Id<'users'>
  dayStart: number
  title: string | null
  plannedStart: number
  plannedEnd: number
}
