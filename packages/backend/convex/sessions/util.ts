import type {
  DashboardMember,
  DashboardPartial,
  DashboardSession,
  DashboardSessionTask,
  SessionTaskSource,
} from './types'

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

// Most study time today first. The dashboard splits online/offline into separate
// sections, so within each section this is the only ordering that matters.
export function sortMembers(members: DashboardMember[], now: number): DashboardMember[] {
  return [...members].sort((a, b) => memberTotalMs(b, now) - memberTotalMs(a, now))
}

// A completed task belongs to the session whose span contains its `completedAt`:
// `startedAt <= completedAt < (endedAt ?? now)`. The query has no wall clock, so
// a still-running session's open end is `Infinity` — equivalent to `now` because
// `completedAt` is always a past instant.
export function sessionContainsCompletedAt(
  session: Pick<DashboardSession, 'startedAt' | 'endedAt'>,
  completedAt: number
): boolean {
  return (
    completedAt >= session.startedAt && completedAt < (session.endedAt ?? Number.POSITIVE_INFINITY)
  )
}

// Attach each session's deduped task union: tasks explicitly planned into it,
// then tasks finished while it was running, each appearing at most once. A member's
// sessions never overlap (re-entering within 30 minutes continues the same
// session), so a completion binds to at most one. Planned entries come first in
// creation order (oldest first); finished-only entries follow by completion time.
export function attachTasksToSessions(
  sessions: DashboardSession[],
  tasks: SessionTaskSource[]
): DashboardSession[] {
  return sessions.map((session) => ({
    ...session,
    tasks: tasksForSession(session, tasks),
  }))
}

function tasksForSession(
  session: Pick<DashboardSession, 'id' | 'startedAt' | 'endedAt'>,
  tasks: SessionTaskSource[]
): DashboardSessionTask[] {
  const planned: DashboardSessionTask[] = tasks
    .filter((task) => task.plannedSessionId === session.id)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((task) => ({
      id: task.id,
      title: task.title,
      planned: true,
      // Planned-only stays null even if the task is Done elsewhere; only a
      // completion inside this session's span marks it finished here.
      completedAt:
        task.completedAt !== null && sessionContainsCompletedAt(session, task.completedAt)
          ? task.completedAt
          : null,
    }))

  const finishedOnly: DashboardSessionTask[] = tasks
    .filter(
      (task) =>
        task.plannedSessionId !== session.id &&
        task.completedAt !== null &&
        sessionContainsCompletedAt(session, task.completedAt)
    )
    .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0))
    .map((task) => ({
      id: task.id,
      title: task.title,
      planned: false,
      completedAt: task.completedAt,
    }))

  return [...planned, ...finishedOnly]
}

// Compact duration with seconds, so a live total visibly ticks each second:
// `3h30m05s`, `33m12s`, `5s`.
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000)
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)
  const ss = String(seconds).padStart(2, '0')
  if (hours > 0) return `${hours}h${String(minutes).padStart(2, '0')}m${ss}s`
  if (minutes > 0) return `${minutes}m${ss}s`
  return `${seconds}s`
}

// Hours and minutes only — for Day totals, which should read steadily rather than
// tick each second: `3h30m`, `45m`, `0m`.
export function formatDurationHM(ms: number): string {
  const totalMinutes = Math.floor(Math.max(0, ms) / 60_000)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)
  if (hours > 0) return `${hours}h${String(minutes).padStart(2, '0')}m`
  return `${minutes}m`
}

// A stopwatch clock — `HH:MM:SS`, always hours, always both digits: `01:23:45`,
// `00:04:12`, `00:00:00`. For the room's shared timer, which a fast tick makes
// read as a clock rather than a stepping count.
export function formatDurationClock(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
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

// The start of the Day after `dayStart`, DST-safe. Adding 36h overshoots any
// real day (max 25h) but stays inside the next one, so correcting to local
// midnight lands on the true boundary.
export function nextDayStart(dayStart: number, timeZone: string): number {
  return startOfDay(dayStart + 36 * 60 * 60 * 1000, timeZone)
}

// The start of the Day before `dayStart`, DST-safe. Subtracting 12h lands in the
// previous Day for any real day length, so correcting to local midnight is safe.
export function previousDayStart(dayStart: number, timeZone: string): number {
  return startOfDay(dayStart - 12 * 60 * 60 * 1000, timeZone)
}

// Monday 00:00 of the Week containing `now`, DST-safe. Walk back whole calendar
// days in UTC, then correct to local midnight.
export function startOfWeek(now: number, timeZone: string): number {
  const { year, month, day } = zonedParts(now, timeZone)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  const daysSinceMonday = (weekday + 6) % 7
  const monday = Date.UTC(year, month - 1, day - daysSinceMonday)
  return startOfDay(monday, timeZone)
}

// 00:00 on the 1st of the Month containing `now`.
export function startOfMonth(now: number, timeZone: string): number {
  const { year, month } = zonedParts(now, timeZone)
  return startOfDay(Date.UTC(year, month - 1, 1), timeZone)
}

// Move a Day by whole calendar months, preserving its day-of-month and clamping
// to the target Month's last day. `dayStart` is a Europe/Zurich midnight; the
// result is the same wall-clock Day in the new Month, DST-safe.
export function shiftMonth(dayStart: number, months: number, timeZone: string): number {
  const { year, month, day } = zonedParts(dayStart, timeZone)
  const target = new Date(Date.UTC(year, month - 1 + months, 1))
  const targetYear = target.getUTCFullYear()
  const targetMonth = target.getUTCMonth() + 1
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate()
  return startOfDay(Date.UTC(targetYear, targetMonth - 1, Math.min(day, lastDay)), timeZone)
}

// The calendar day-of-month (1–31) of an instant in `timeZone`.
export function dayOfMonth(instant: number, timeZone: string): number {
  return zonedParts(instant, timeZone).day
}

// Monday 00:00 of the Week after `weekStart`, DST-safe. Walk seven calendar days
// forward, then correct to local midnight. The half-open end bound of a Week.
export function nextWeekStart(weekStart: number, timeZone: string): number {
  const { year, month, day } = zonedParts(weekStart, timeZone)
  return startOfDay(Date.UTC(year, month - 1, day + 7), timeZone)
}

// 00:00 on the 1st of the Month after `monthStart`. The half-open end bound of a
// Month.
export function nextMonthStart(monthStart: number, timeZone: string): number {
  const { year, month } = zonedParts(monthStart, timeZone)
  return startOfDay(Date.UTC(year, month, 1), timeZone)
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
