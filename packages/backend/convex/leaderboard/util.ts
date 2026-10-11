import type { StudyMode } from '../bot/types'
import type { DashboardMember, DashboardPartial, DashboardSession } from '../sessions/types'
import { partialDurationMs } from '../sessions/util'
import type { LeaderboardRow } from './types'

// The board shows the top ten — enough to be useful, short enough to read.
export const MAX_LEADERBOARD_ROWS = 10

// Camera modes are the "Deep focus" evidence (see GLOSSARY).
const DEEP_FOCUS_MODES: ReadonlySet<StudyMode> = new Set(['camera', 'cameraAndScreenShare'])

export function isDeepFocus(partial: Pick<DashboardPartial, 'mode'>): boolean {
  return DEEP_FOCUS_MODES.has(partial.mode)
}

// A member's Deep focus today: camera-on partials only, live-aware.
export function memberDeepFocusMs(member: Pick<DashboardMember, 'sessions'>, now: number): number {
  return member.sessions.reduce((sum, session) => sum + sessionDeepFocusMs(session, now), 0)
}

// A member's Total time today: each session's whole span, Pauses included. Unlike
// Study time (`memberTotalMs`), this deliberately does not skip breaks.
export function memberSpanMs(member: Pick<DashboardMember, 'sessions'>, now: number): number {
  return member.sessions.reduce((sum, session) => sum + sessionSpanMs(session, now), 0)
}

// Members ranked by Deep focus, tie-broken by Total time then a stable id. Total
// time is carried for display but never ranked.
export function rankMembers(members: DashboardMember[], now: number): LeaderboardRow[] {
  return members
    .map((member) => ({
      discordId: member.discordId,
      name: member.name,
      deepFocusMs: memberDeepFocusMs(member, now),
      totalMs: memberSpanMs(member, now),
      online: member.online,
    }))
    .sort(
      (a, b) =>
        b.deepFocusMs - a.deepFocusMs ||
        b.totalMs - a.totalMs ||
        a.discordId.localeCompare(b.discordId)
    )
    .slice(0, MAX_LEADERBOARD_ROWS)
}

function sessionDeepFocusMs(session: Pick<DashboardSession, 'partials'>, now: number): number {
  return session.partials
    .filter(isDeepFocus)
    .reduce((sum, partial) => sum + partialDurationMs(partial, now), 0)
}

function sessionSpanMs(
  session: Pick<DashboardSession, 'startedAt' | 'endedAt'>,
  now: number
): number {
  return Math.max(0, (session.endedAt ?? now) - session.startedAt)
}
