import type { Doc } from '@studytrack/backend/convex/_generated/dataModel'
import { api } from '@studytrack/backend/convex/_generated/api'
import type { DashboardMember } from '@studytrack/backend/convex/workSessions/types'
import { useQuery } from 'convex/react'
import { useDayStart } from '~/hooks/use-day-start'
import { useNow } from '~/hooks/use-now'

// The day timeline's live read: the same per-member dashboard payload the room
// rail reads, plus the three things a query cannot carry — the ticking wall
// clock, the day the payload was read against, and which member is "you".
//
// The dashboard query only returns members who studied today, so a signed-in
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
}

export function useTimeline(): TimelineData {
  const dayStart = useDayStart()
  const now = useNow(1000)
  const members = useQuery(api.workSessions.getTodaysActivitiesForDashboard, { dayStart })
  const me = useQuery(api.users.me)
  const ready = members !== undefined && me !== undefined

  return {
    members: ready ? withOwnLane(members, me) : undefined,
    now,
    dayStart,
    me: me ? String(me._id) : null,
  }
}

// Guarantee the signed-in member a lane. If they already studied today the query
// carried them; otherwise splice in an empty one, keyed by their user id (the
// same key `toTimelineRows` matches "you" on). A signed-out caller has no `me`
// and gets no lane.
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
