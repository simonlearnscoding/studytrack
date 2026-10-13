import { v, type Infer } from 'convex/values'
import type { Id } from '../_generated/dataModel'

// Internal entry args. `rollupRecent` takes none; `backfill` may start at a
// chosen Day and otherwise finds the first Day with data.
export const rollupDayArgs = v.object({ dayStart: v.number() })
export const backfillArgs = v.object({ dayStart: v.optional(v.number()) })

export type RollupDayArgs = Infer<typeof rollupDayArgs>
export type BackfillArgs = Infer<typeof backfillArgs>

// One member's summed Daily totals over a range of Days, as readers consume it.
// `discordId`/`userId` are null when no row in the range carried them.
export type DailyTotalSum = {
  memberKey: string
  discordId: string | null
  userId: Id<'users'> | null
  studyMs: number
  deepFocusMs: number
  totalMs: number
}
