import { v, type Infer } from 'convex/values'
import type { Id } from '../_generated/dataModel'

// One plan's whole window, supplied by the caller. `dayStart` is the Europe/Zurich
// Day the plan belongs to; the two instants must sit inside it and on the
// 15-minute grid the drag snaps to.
export const createOrMovePlanArgs = v.object({
  dayStart: v.number(),
  plannedStart: v.number(),
  plannedEnd: v.number(),
})
export type CreateOrMovePlanArgs = Infer<typeof createOrMovePlanArgs>

// The owner's view of a planned session. Not a Session: there is no voice
// evidence and no partials, only the window the member pencilled in.
export type PlannedSession = {
  id: Id<'plannedSession'>
  userId: Id<'users'>
  dayStart: number
  plannedStart: number
  plannedEnd: number
}
