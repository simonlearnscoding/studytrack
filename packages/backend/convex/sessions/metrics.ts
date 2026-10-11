import type { DashboardMember, DashboardSession } from './types'
import { partialDurationMs } from './util'

// Personal-rail statistics over the same dashboard payload the room uses.
// Total time and Focus rate follow the GLOSSARY definitions; the leaderboard's
// memberSpanMs computes a similar span for the bot — dedupe once that work
// lands.

// Modes that count toward Focus rate: camera or screen share on. `voice`,
// `break` and `manual` never count — manual has no Discord evidence.
const FOCUS_MODES: ReadonlySet<string> = new Set(['camera', 'screenShare', 'cameraAndScreenShare'])

// The whole span of one session, pauses included, live while it is active.
export function sessionSpanMs(
  session: Pick<DashboardSession, 'startedAt' | 'endedAt'>,
  now: number
): number {
  return Math.max(0, (session.endedAt ?? now) - session.startedAt)
}

// Total time: the sum of a member's session spans for the day.
export function memberSpanTotalMs(member: Pick<DashboardMember, 'sessions'>, now: number): number {
  return member.sessions.reduce((total, session) => total + sessionSpanMs(session, now), 0)
}

// The part of a member's day spent with camera or screen share on.
export function memberFocusMs(member: Pick<DashboardMember, 'sessions'>, now: number): number {
  let focus = 0
  for (const session of member.sessions) {
    for (const partial of session.partials) {
      if (FOCUS_MODES.has(partial.mode)) focus += partialDurationMs(partial, now)
    }
  }
  return focus
}

// Focus rate: focus over total, or null when there is no session time yet.
export function focusRate(focusMs: number, totalMs: number): number | null {
  return totalMs === 0 ? null : focusMs / totalMs
}

// Compact tile formatting — hours and minutes, no ticking seconds ("1h 32m").
export function formatCompactMs(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}
