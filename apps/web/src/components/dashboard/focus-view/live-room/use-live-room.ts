import { api } from '@studytrack/backend/convex/_generated/api'
import { sessionFocusMs, sessionSpanMs } from '@studytrack/backend/convex/sessions/metrics'
import type { DashboardMember, DashboardSession } from '@studytrack/backend/convex/sessions/types'
import { formatDurationHM } from '@studytrack/backend/convex/sessions/util'
import { useQuery } from 'convex/react'
import { useDayStart } from '~/hooks/use-day-start'
import type { Metric } from '@studytrack/backend/convex/preferences/types'
import { colorFor, initials } from '../../../../lib/avatar'

type StudyMode = DashboardMember['sessions'][number]['partials'][number]['mode']

// One person in the present-tense room, shaped for the rail. `time` is null until
// the client clock exists (server render), so the rail never disagrees with the
// server's HTML. `mode` is null on a break (no icon); `task` is the member's
// active task, or null when they have none. `idle` is the playful line shown
// instead when there is no task to name.
export type RoomPerson = {
  key: string
  initials: string
  color: string
  name: string
  time: string | null
  mode: Exclude<StudyMode, 'break'> | null
  task: string | null
  idle: string
}

// Everyone currently in a study channel, earliest-joined first (the rail's "join
// order"). The present-tense slice of the same dashboard query the full room panel
// reads; the caller supplies the clock for any durations it derives.
export function useRoom(): { inRoom: DashboardMember[] | undefined; count: number } {
  const dayStart = useDayStart()
  const members = useQuery(api.sessions.getTodaysActivitiesForDashboard, { dayStart })
  const inRoom = members
    ?.filter((member) => member.online)
    .sort((a, b) => joinedAt(a) - joinedAt(b))
  return { inRoom, count: inRoom?.length ?? 0 }
}

// Map a live member to the rail's row: their name, how long they have been in
// (their own session, in the metric the site switch fronts — Deep focus or
// Total) and the mode they are studying in. `time` is null on the server render
// (see the type); `mode` is null on a break.
export function toRoomPerson(
  member: DashboardMember,
  now: number | null,
  metric: Metric
): RoomPerson {
  const name = member.name ?? member.discordId
  const active = activeSession(member)
  const mode = active ? currentMode(active) : null

  return {
    key: member.discordId,
    initials: initials(name),
    color: colorFor(member.discordId),
    name,
    time:
      active && now !== null
        ? formatDurationHM(
            metric === 'focus' ? sessionFocusMs(active, now) : sessionSpanMs(active, now)
          )
        : null,
    mode: mode && mode !== 'break' ? mode : null,
    task: member.activeTask?.title ?? null,
    idle: idleLine(member.discordId, now),
  }
}

function activeSession(member: DashboardMember): DashboardSession | undefined {
  return member.sessions.find((session) => session.status === 'active')
}

function joinedAt(member: DashboardMember): number {
  return activeSession(member)?.startedAt ?? Number.MAX_SAFE_INTEGER
}

// The mode of the partial still running, or the latest one if the session has just
// closed; this is the "how they are studying" the rail shows as an icon.
function currentMode(
  session: DashboardSession
): DashboardSession['partials'][number]['mode'] | null {
  const current =
    session.partials.find((partial) => partial.endedAt === null) ?? session.partials[0]
  return current?.mode ?? null
}

// The playful line for a member in the room with no task to name — "cooking",
// "vibing" — so the now-line still answers "what are they on" when the answer is
// just vibes. The trailing dots are added by the rail and animate off the clock.
// Each member starts at a different word (offset by id) and the whole room
// advances one word a minute, so it reads as churn rather than a canned label.
const IDLE_LINES = [
  'cooking',
  'in the zone',
  'locked in',
  'grinding',
  'marinating',
  'simmering',
  'percolating',
  'noodling',
  'vibing',
  'caffeinating',
  'brain churning',
  'rewiring neurons',
  'learning by osmosis',
  'plotting world domination',
  'buffering',
  'touching grass later',
]

function idleLine(id: string, now: number | null): string {
  const minute = now === null ? 0 : Math.floor(now / 60_000)
  return IDLE_LINES[(hashId(id) + minute) % IDLE_LINES.length]
}

function hashId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return hash
}
