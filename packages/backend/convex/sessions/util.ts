import type { DashboardMember, DashboardPartial, DashboardSession } from './types'

// The dashboard's "today" is one shared calendar day in this timezone, so every
// viewer sees the same grouping. Move this single constant to shift the day
// boundary for the whole board.
export const DASHBOARD_TIME_ZONE = 'Europe/Zurich'

// A partial's current length. Ended partials are fixed; a running one is live
// from `startedAt` to `now`, which the caller supplies from its own clock.
export function partialDurationMs(
  partial: Pick<DashboardPartial, 'startedAt' | 'endedAt'>,
  now: number
): number {
  return Math.max(0, (partial.endedAt ?? now) - partial.startedAt)
}

// Study time in one session: every partial's duration with breaks left out.
export function sessionStudyMs(session: Pick<DashboardSession, 'partials'>, now: number): number {
  return session.partials
    .filter((partial) => partial.mode !== 'break')
    .reduce((sum, partial) => sum + partialDurationMs(partial, now), 0)
}

// A member's study time across every session today.
export function memberTotalMs(member: Pick<DashboardMember, 'sessions'>, now: number): number {
  return member.sessions.reduce((sum, session) => sum + sessionStudyMs(session, now), 0)
}

// Online first, then whoever has studied most today. Recomputed against `now` so
// a running partial keeps moving its member up the board.
export function sortMembers(members: DashboardMember[], now: number): DashboardMember[] {
  return [...members].sort(
    (a, b) => Number(b.online) - Number(a.online) || memberTotalMs(b, now) - memberTotalMs(a, now)
  )
}

// Whole minutes, e.g. `3h30m`, `45m`, `0m`.
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(Math.max(0, ms) / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`
}

// Midnight (epoch ms) of the calendar day `now` falls in, for a named timezone.
export function startOfDay(now: number, timeZone: string): number {
  const { year, month, day } = zonedParts(now, timeZone)
  // Guess UTC midnight, then correct by the zone's offset. Two passes so a DST
  // change landing on the boundary still resolves to the true local midnight.
  const utcMidnight = Date.UTC(year, month - 1, day)
  const firstPass = utcMidnight - zoneOffsetMs(new Date(utcMidnight), timeZone)
  return utcMidnight - zoneOffsetMs(new Date(firstPass), timeZone)
}

function zonedParts(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant))
  return {
    year: Number(parts.find((p) => p.type === 'year')?.value),
    month: Number(parts.find((p) => p.type === 'month')?.value),
    day: Number(parts.find((p) => p.type === 'day')?.value),
  }
}

// How far `timeZone`'s wall clock is ahead of UTC at `date` (ms).
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second')
  )
  return asUtc - date.getTime()
}
