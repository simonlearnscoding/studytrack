import type { Doc } from '@studytrack/backend/convex/_generated/dataModel'
import { api } from '@studytrack/backend/convex/_generated/api'
import { DASHBOARD_TIME_ZONE, nextDayStart } from '@studytrack/backend/convex/workSessions/util'
import type { DashboardMember } from '@studytrack/backend/convex/workSessions/types'
import { useQuery } from 'convex/react'
import { useDayStart } from '~/hooks/use-day-start'
import { useNow } from '~/hooks/use-now'

// The day timeline's live read: the same per-member dashboard payload the room
// rail reads, plus the things a query cannot carry — the clock that belongs to
// the focused day, that day's start, and which member is "you".
//
// `dayStart` is injected by the caller (the Focus day), never read from the
// clock here. `todayStart` is the one live Day, so the backend knows whether to
// include still-running Sessions. A past Day freezes its clock at the next
// midnight: nothing in it is still running, and plan blocks are all decided. A
// future Day sees its own midnight, so nothing has elapsed yet.
//
// The dashboard query only returns members who studied that day, so a signed-in
// member with nothing tracked is absent from the payload. A member's own lane is
// the drag-to-plan surface (LD-6), so it must be present even on an empty day:
// `withOwnLane` appends a stub member for `me` when the payload omits them. The
// backend stays unchanged — the room rail reads the same query and never wants a
// phantom offline member.
//
// `members` stays undefined until both reads land, so the view can hold its
// skeleton rather than flash an empty (or a not-yet-marked) day.
export type TimelineData = {
  members: DashboardMember[] | undefined
  now: number
  dayStart: number
  me: string | null
  isToday: boolean
  isPast: boolean
}

export function useTimeline(dayStart: number): TimelineData {
  const todayStart = useDayStart()
  const isToday = dayStart === todayStart
  // Only today's track has a moving now-line and growing live bars. A closed or
  // future Day uses a frozen clock, so ticking it once a minute (instead of once
  // a second) keeps the whole track from re-rendering for nothing.
  const wallNow = useNow(isToday ? 1000 : 60_000)
  const isPast = dayStart < todayStart
  const now = isToday ? wallNow : isPast ? nextDayStart(dayStart, DASHBOARD_TIME_ZONE) : dayStart
  const members = useQuery(api.workSessions.getTodaysActivitiesForDashboard, {
    dayStart,
    todayStart,
  })
  const me = useQuery(api.users.me)
  const ready = members !== undefined && me !== undefined

  return {
    members: ready ? withOwnLane(members, me) : undefined,
    now,
    dayStart,
    me: me ? String(me._id) : null,
    isToday,
    isPast,
  }
}

// Guarantee the signed-in member a lane. If they already studied that day the
// query carried them; otherwise splice in an empty one, keyed by their user id
// (the same key `toTimelineRows` matches "you" on). A signed-out caller has no
// `me` and gets no lane.
function withOwnLane(members: DashboardMember[], me: Doc<'users'> | null): DashboardMember[] {
  if (!me) return members
  const mine = String(me._id)
  if (members.some((member) => member.userId !== null && String(member.userId) === mine)) {
    return members
  }
  return [
    ...members,
    {
      userId: me._id,
      discordId: me.discordId ?? mine,
      name: me.name ?? null,
      image: me.image ?? null,
      online: false,
      workSessions: [],
      planBlocks: [],
      activeTask: null,
    },
  ]
}
