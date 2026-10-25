import type { StudyMode } from '../bot/types'
import { overlapMs } from '../dailyTotals/util'
import type { DashboardMember } from '../workSessions/types'
import type {
  LeaderboardCell,
  LeaderboardPeriodTotals,
  LeaderboardTableTotal,
  LeaderboardTotal,
} from './types'
import { leaderboardPeriods } from './types'

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

// Today's live totals per member, every partial and workSession span clipped to the
// calendar Day [dayStart, now). A workSession crossing midnight now counts only the
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
    image: member.image,
    deepFocusMs: memberDeepFocusMs(member, dayStart, now),
    totalMs: memberSpanMs(member, dayStart, now),
    online: member.online,
  }))
}

// The board's two possible lead metrics. The selected one is primary and the
// other breaks ties, so the two orderings never disagree about what counts.
type LeadMetric = 'focus' | 'total'

// Members ordered by the leading metric, the other metric, then a stable id.
export function orderTotals<T extends { discordId: string; deepFocusMs: number; totalMs: number }>(
  rows: T[],
  metric: LeadMetric
): T[] {
  return [...rows].sort((a, b) =>
    metric === 'focus'
      ? b.deepFocusMs - a.deepFocusMs ||
        b.totalMs - a.totalMs ||
        a.discordId.localeCompare(b.discordId)
      : b.totalMs - a.totalMs ||
        b.deepFocusMs - a.deepFocusMs ||
        a.discordId.localeCompare(b.discordId)
  )
}

// Members ranked by Deep focus, tie-broken by Total time then a stable id, capped
// at the top ten. Pure: it takes already-computed totals and reorders them.
export function rankTotals<T extends { discordId: string; deepFocusMs: number; totalMs: number }>(
  rows: T[]
): T[] {
  return orderTotals(rows, 'focus').slice(0, MAX_LEADERBOARD_ROWS)
}

// The web's comparison table: one row per member who reaches a period's top ten
// under either metric, carrying every period's numbers. Keeping the union means a
// member visible in Day still has a real Week value when the Week list cut them,
// so a missing period can mean "no time" rather than "not in that top ten".
export function buildTableRows(
  totals: Pick<LeaderboardPeriodTotals, 'day' | 'week' | 'month'>
): LeaderboardTableTotal[] {
  const rankings = {
    day: rankBothMetrics(totals.day),
    week: rankBothMetrics(totals.week),
    month: rankBothMetrics(totals.month),
  }

  const memberKeys = new Set<string>()
  for (const period of leaderboardPeriods) {
    for (const metric of ['focus', 'total'] as const) {
      for (const [memberKey, ranked] of rankings[period][metric]) {
        if (ranked.rank <= MAX_LEADERBOARD_ROWS) memberKeys.add(memberKey)
      }
    }
  }

  return [...memberKeys].map((memberKey) => {
    const cells = {} as Record<(typeof leaderboardPeriods)[number], LeaderboardCell>
    let name: string | null = null
    let image: string | null = null
    let userId: LeaderboardTableTotal['userId'] = null

    for (const period of leaderboardPeriods) {
      const focus = rankings[period].focus.get(memberKey)
      const total = rankings[period].total.get(memberKey)
      const source = focus?.total ?? total?.total
      cells[period] = {
        deepFocusMs: source?.deepFocusMs ?? 0,
        totalMs: source?.totalMs ?? 0,
        deepFocusRank: focus?.rank ?? null,
        totalRank: total?.rank ?? null,
      }
      if (source) {
        name ??= source.name
        image ??= source.image
        userId ??= source.userId
      }
    }

    return { discordId: memberKey, name, image, userId, ...cells }
  })
}

// Deep focus in the window: camera-on partials, clipped, live-aware.
function memberDeepFocusMs(member: DashboardMember, windowStart: number, windowEnd: number) {
  let focus = 0
  for (const workSession of member.workSessions) {
    for (const partial of workSession.partials) {
      if (!isDeepFocus(partial)) continue
      focus += overlapMs(partial.startedAt, partial.endedAt ?? windowEnd, windowStart, windowEnd)
    }
  }
  return focus
}

// Total time in the window: each workSession's whole span, Pauses included, clipped.
function memberSpanMs(member: DashboardMember, windowStart: number, windowEnd: number) {
  let total = 0
  for (const workSession of member.workSessions) {
    total += overlapMs(
      workSession.startedAt,
      workSession.endedAt ?? windowEnd,
      windowStart,
      windowEnd
    )
  }
  return total
}

type RankedTotal = { rank: number; total: LeaderboardTotal }

function rankBothMetrics(rows: LeaderboardTotal[]): Record<LeadMetric, Map<string, RankedTotal>> {
  return {
    focus: rankByMetric(rows, 'focus'),
    total: rankByMetric(rows, 'total'),
  }
}

function rankByMetric(rows: LeaderboardTotal[], metric: LeadMetric): Map<string, RankedTotal> {
  const ranked = new Map<string, RankedTotal>()
  orderTotals(rows, metric).forEach((total, index) => {
    ranked.set(total.discordId, { rank: index + 1, total })
  })
  return ranked
}
