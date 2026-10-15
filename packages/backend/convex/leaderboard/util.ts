import type { StudyMode } from '../bot/types'
import { overlapMs } from '../dailyTotals/util'
import type { DashboardMember } from '../sessions/types'
import type { LeaderboardTotal } from './types'

// The board shows the top ten — enough to be useful, short enough to read.
export const MAX_LEADERBOARD_ROWS = 10

// Camera or screen share are the "Deep focus" evidence (see GLOSSARY). They count
// equally — only the timeline's visual ladder separates a both-on partial.
const DEEP_FOCUS_MODES: ReadonlySet<StudyMode> = new Set([
  'camera',
  'screenShare',
  'cameraAndScreenShare',
])

export function isDeepFocus(partial: { mode: StudyMode }): boolean {
  return DEEP_FOCUS_MODES.has(partial.mode)
}

// Today's live totals per member, every partial and session span clipped to the
// calendar Day [dayStart, now). A session crossing midnight now counts only the
// minutes after midnight, so Today and the Week agree.
export function todaysTotals(
  members: DashboardMember[],
  dayStart: number,
  now: number
): LeaderboardTotal[] {
  return members.map((member) => ({
    discordId: member.discordId,
    userId: member.userId,
    name: member.name,
    deepFocusMs: memberDeepFocusMs(member, dayStart, now),
    totalMs: memberSpanMs(member, dayStart, now),
    online: member.online,
  }))
}

// Members ranked by Deep focus, tie-broken by Total time then a stable id, capped
// at the top ten. Pure: it takes already-computed totals and reorders them.
export function rankTotals<T extends { discordId: string; deepFocusMs: number; totalMs: number }>(
  rows: T[]
): T[] {
  return [...rows]
    .sort(
      (a, b) =>
        b.deepFocusMs - a.deepFocusMs ||
        b.totalMs - a.totalMs ||
        a.discordId.localeCompare(b.discordId)
    )
    .slice(0, MAX_LEADERBOARD_ROWS)
}

// Deep focus in the window: camera-on partials, clipped, live-aware.
function memberDeepFocusMs(member: DashboardMember, windowStart: number, windowEnd: number) {
  let focus = 0
  for (const session of member.sessions) {
    for (const partial of session.partials) {
      if (!isDeepFocus(partial)) continue
      focus += overlapMs(partial.startedAt, partial.endedAt ?? windowEnd, windowStart, windowEnd)
    }
  }
  return focus
}

// Total time in the window: each session's whole span, Pauses included, clipped.
function memberSpanMs(member: DashboardMember, windowStart: number, windowEnd: number) {
  let total = 0
  for (const session of member.sessions) {
    total += overlapMs(session.startedAt, session.endedAt ?? windowEnd, windowStart, windowEnd)
  }
  return total
}
