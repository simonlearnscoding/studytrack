import { v, type Infer } from 'convex/values'
import type { Id } from '../_generated/dataModel'

// Internal entry args. `rollupRecent` takes none; `backfill` may start at a
// chosen Day and otherwise finds the first Day with data.
export const rollupDayArgs = v.object({ dayStart: v.number() })
export const backfillArgs = v.object({ dayStart: v.optional(v.number()) })

// The caller's own record from a Day onwards. The caller supplies `fromDayStart`
// because queries must not read the wall clock (see ../workSessions/util).
export const listMineArgs = v.object({ fromDayStart: v.number() })

// One Month window for the private calendar, plus the caller's clock so today's
// live row can be merged at read time. The window is half-open: [from, to).
export const getCalendarArgs = v.object({
  fromDayStart: v.number(),
  toDayStart: v.number(),
  now: v.number(),
})

export type RollupDayArgs = Infer<typeof rollupDayArgs>
export type BackfillArgs = Infer<typeof backfillArgs>
export type ListMineArgs = Infer<typeof listMineArgs>
export type GetCalendarArgs = Infer<typeof getCalendarArgs>

// One Day of the caller's own record, as the heatmap and Streak consume it.
export type DailyTotalDay = {
  dayStart: number
  studyMs: number
}

// One Day in the calendar: its Day start and the two site metrics. A missing Day
// reads as both zero, so the read may omit Days with no study.
export type DailyTotalCalendarDay = {
  dayStart: number
  deepFocusMs: number
  totalMs: number
}

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
