import type { DashboardMember, DashboardWorkSession } from './types'
import { partialDurationMs } from './util'

// Personal-rail statistics over the same dashboard payload the room uses.
// Total time and Focus rate follow the GLOSSARY definitions; the leaderboard's
// memberSpanMs computes a similar span for the bot — dedupe once that work
// lands.

// Modes that count toward Focus rate: camera or screen share on. `voice`,
// `break` and `manual` never count — manual has no Discord evidence.
const FOCUS_MODES: ReadonlySet<string> = new Set(['camera', 'screenShare', 'cameraAndScreenShare'])

// The whole span of one workSession, pauses included, live while it is active.
export function workSessionSpanMs(
  workSession: Pick<DashboardWorkSession, 'startedAt' | 'endedAt'>,
  now: number
): number {
  return Math.max(0, (workSession.endedAt ?? now) - workSession.startedAt)
}

// Total time: the sum of a member's workSession spans for the day.
export function memberSpanTotalMs(
  member: Pick<DashboardMember, 'workSessions'>,
  now: number
): number {
  return member.workSessions.reduce(
    (total, workSession) => total + workSessionSpanMs(workSession, now),
    0
  )
}

// The part of one workSession spent with camera or screen share on.
export function workSessionFocusMs(
  workSession: Pick<DashboardWorkSession, 'partials'>,
  now: number
): number {
  let focus = 0
  for (const partial of workSession.partials) {
    if (FOCUS_MODES.has(partial.mode)) focus += partialDurationMs(partial, now)
  }
  return focus
}

// The part of a member's day spent with camera or screen share on.
export function memberFocusMs(member: Pick<DashboardMember, 'workSessions'>, now: number): number {
  return member.workSessions.reduce(
    (focus, workSession) => focus + workSessionFocusMs(workSession, now),
    0
  )
}

// Collective focus time (GLOSSARY): the room's shared effort this sitting — the
// sum, across every member still in a workSession, of what their *active* workSession has
// put in. Each person adds a second for every second they study, so three people
// deep-focusing an hour read `3h`. Only the active workSession counts, so the total
// is naturally gone the moment the room empties (a new sitting starts a new
// workSession) — there is no stored reset. The Focus cut integrates Deep focus only;
// Total counts the whole span, pauses included, exactly as the personal rail does.
export function collectiveFocusMs(
  members: readonly Pick<DashboardMember, 'workSessions'>[],
  now: number,
  metric: 'focus' | 'total'
): number {
  return members.reduce((shared, member) => {
    const active = member.workSessions.find((workSession) => workSession.status === 'active')
    if (!active) return shared
    return (
      shared +
      (metric === 'total' ? workSessionSpanMs(active, now) : workSessionFocusMs(active, now))
    )
  }, 0)
}

// Focus rate: focus over total, or null when there is no workSession time yet.
export function focusRate(focusMs: number, totalMs: number): number | null {
  return totalMs === 0 ? null : focusMs / totalMs
}

// Compact tile formatting — hours and minutes, no ticking seconds ("1h 32m").
export function formatCompactMs(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}
