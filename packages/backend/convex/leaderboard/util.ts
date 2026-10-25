import type { StudyMode } from '../bot/types'
import { overlapMs } from '../dailyTotals/util'
import {
  DASHBOARD_TIME_ZONE,
  nextDayStart,
  nextMonthStart,
  nextWeekStart,
  startOfMonth,
  startOfWeek,
} from '../workSessions/util'
import type { DashboardMember, LiveTail } from '../workSessions/types'
import type {
  LeaderboardCell,
  LeaderboardPeriodTotals,
  LeaderboardRankedCell,
  LeaderboardRankedRow,
  LeaderboardTableRow,
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
    deepFocusMs: memberDeepFocusMs(member, dayStart, now, now),
    totalMs: memberSpanMs(member, dayStart, now, now),
    online: member.online,
  }))
}

// Today's settled totals: every closed piece counted in full, with still-running
// pieces contributing nothing. The remainder is described by `liveTailFor` and
// added against the reader's own clock, so this read stays stable for the Day.
export function todaysSettledTotals(
  members: DashboardMember[],
  dayStart: number
): LeaderboardTotal[] {
  const dayEnd = nextDayStart(dayStart, DASHBOARD_TIME_ZONE)
  return members.map((member) => ({
    discordId: member.discordId,
    userId: member.userId,
    name: member.name,
    image: member.image,
    deepFocusMs: memberDeepFocusMs(member, dayStart, dayEnd, dayStart),
    totalMs: memberSpanMs(member, dayStart, dayEnd, dayStart),
    online: member.online,
  }))
}

// Where each member's live time starts accruing inside the current Day. A member
// with nothing running is omitted, so callers can read a missing key as "no tail".
export function liveTailsByMember(
  members: DashboardMember[],
  dayStart: number
): Map<string, LiveTail> {
  const tails = new Map<string, LiveTail>()
  for (const member of members) {
    const tail = liveTailFor(member, dayStart)
    if (tail.deepFocusSince !== null || tail.spanSince !== null) {
      tails.set(member.discordId, tail)
    }
  }
  return tails
}

// A member's open ends, clipped to the Day start. Pure: the Day start is passed
// in, so callers with different clocks still agree on which Day is live.
export function liveTailFor(
  member: Pick<DashboardMember, 'workSessions'>,
  dayStart: number
): LiveTail {
  let deepFocusSince: number | null = null
  let spanSince: number | null = null

  for (const workSession of member.workSessions) {
    if (workSession.endedAt === null) {
      spanSince = earliest(spanSince, Math.max(workSession.startedAt, dayStart))
    }
    for (const partial of workSession.partials) {
      if (partial.endedAt !== null || !isDeepFocus(partial)) continue
      deepFocusSince = earliest(deepFocusSince, Math.max(partial.startedAt, dayStart))
    }
  }

  return { deepFocusSince, spanSince }
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

// The web's comparison table: every member with time in any period, carrying
// their settled numbers plus the open ends the reader adds itself. Shipping the
// whole group — not a top-ten union — is what lets the reader rank it after
// adding live minutes.
export function buildTableRows(
  totals: Pick<LeaderboardPeriodTotals, 'day' | 'week' | 'month'>,
  liveTails: ReadonlyMap<string, LiveTail>
): LeaderboardTableTotal[] {
  const totalsByPeriod = {
    day: new Map(totals.day.map((total) => [total.discordId, total])),
    week: new Map(totals.week.map((total) => [total.discordId, total])),
    month: new Map(totals.month.map((total) => [total.discordId, total])),
  }

  const memberKeys = new Set<string>()
  for (const period of leaderboardPeriods) {
    for (const total of totals[period]) memberKeys.add(total.discordId)
  }

  return [...memberKeys].map((memberKey) => {
    const cells = {} as Record<(typeof leaderboardPeriods)[number], LeaderboardCell>
    let name: string | null = null
    let image: string | null = null
    let userId: LeaderboardTableTotal['userId'] = null

    for (const period of leaderboardPeriods) {
      const source = totalsByPeriod[period].get(memberKey)
      cells[period] = {
        deepFocusMs: source?.deepFocusMs ?? 0,
        totalMs: source?.totalMs ?? 0,
      }
      if (source) {
        name ??= source.name
        image ??= source.image
        userId ??= source.userId
      }
    }

    return {
      discordId: memberKey,
      name,
      image,
      userId,
      live: liveTails.get(memberKey) ?? { deepFocusSince: null, spanSince: null },
      ...cells,
    }
  })
}

// The three comparison windows, derived from the focus day. Half-open, so the
// reader can clip a live tail to any of them with one overlap.
export type LeaderboardTableWindows = {
  day: { start: number; end: number }
  week: { start: number; end: number }
  month: { start: number; end: number }
}

export function leaderboardTableWindows(focusDayStart: number): LeaderboardTableWindows {
  const weekStart = startOfWeek(focusDayStart, DASHBOARD_TIME_ZONE)
  const monthStart = startOfMonth(focusDayStart, DASHBOARD_TIME_ZONE)
  return {
    day: { start: focusDayStart, end: nextDayStart(focusDayStart, DASHBOARD_TIME_ZONE) },
    week: { start: weekStart, end: nextWeekStart(weekStart, DASHBOARD_TIME_ZONE) },
    month: { start: monthStart, end: nextMonthStart(monthStart, DASHBOARD_TIME_ZONE) },
  }
}

// Add each member's live tail and rank the whole group. Runs in the browser:
// `now` is the reader's clock, so the table ticks without a new subscription.
export function rankLiveTableRows(
  rows: LeaderboardTableRow[],
  focusDayStart: number,
  now: number
): LeaderboardRankedRow[] {
  const windows = leaderboardTableWindows(focusDayStart)
  const liveRows = rows.map((row) => ({
    discordId: row.discordId,
    name: row.name,
    image: row.image,
    day: addLive(row.day, row.live, windows.day, now),
    week: addLive(row.week, row.live, windows.week, now),
    month: addLive(row.month, row.live, windows.month, now),
  }))

  const rankings = {
    day: rankBothMetrics(liveRows.map((row) => ({ discordId: row.discordId, ...row.day }))),
    week: rankBothMetrics(liveRows.map((row) => ({ discordId: row.discordId, ...row.week }))),
    month: rankBothMetrics(liveRows.map((row) => ({ discordId: row.discordId, ...row.month }))),
  }

  return liveRows.map((row) => ({
    discordId: row.discordId,
    name: row.name,
    image: row.image,
    day: withRanks(row.day, rankings.day, row.discordId),
    week: withRanks(row.week, rankings.week, row.discordId),
    month: withRanks(row.month, rankings.month, row.discordId),
  }))
}

// Deep focus in the window: camera-on partials, clipped. `openEnd` is where a
// still-running partial stops for this computation — the reader adds the rest.
function memberDeepFocusMs(
  member: DashboardMember,
  windowStart: number,
  windowEnd: number,
  openEnd: number
) {
  let focus = 0
  for (const workSession of member.workSessions) {
    for (const partial of workSession.partials) {
      if (!isDeepFocus(partial)) continue
      focus += overlapMs(partial.startedAt, partial.endedAt ?? openEnd, windowStart, windowEnd)
    }
  }
  return focus
}

// Total time in the window: each workSession's whole span, Pauses included,
// clipped. `openEnd` plays the same role as in `memberDeepFocusMs`.
function memberSpanMs(
  member: DashboardMember,
  windowStart: number,
  windowEnd: number,
  openEnd: number
) {
  let total = 0
  for (const workSession of member.workSessions) {
    total += overlapMs(
      workSession.startedAt,
      workSession.endedAt ?? openEnd,
      windowStart,
      windowEnd
    )
  }
  return total
}

// One member's settled cell plus the tail accrued inside the window.
function addLive(
  cell: LeaderboardCell,
  tail: LiveTail,
  window: { start: number; end: number },
  now: number
): LeaderboardCell {
  return {
    deepFocusMs:
      cell.deepFocusMs +
      (tail.deepFocusSince === null
        ? 0
        : overlapMs(tail.deepFocusSince, now, window.start, window.end)),
    totalMs:
      cell.totalMs +
      (tail.spanSince === null ? 0 : overlapMs(tail.spanSince, now, window.start, window.end)),
  }
}

type CellTotals = { discordId: string; deepFocusMs: number; totalMs: number }

function rankBothMetrics(rows: CellTotals[]): Record<LeadMetric, Map<string, number>> {
  const present = rows.filter((row) => row.deepFocusMs > 0 || row.totalMs > 0)
  return {
    focus: rankByMetric(present, 'focus'),
    total: rankByMetric(present, 'total'),
  }
}

function rankByMetric(rows: CellTotals[], metric: LeadMetric): Map<string, number> {
  const ranked = new Map<string, number>()
  orderTotals(rows, metric).forEach((row, index) => ranked.set(row.discordId, index + 1))
  return ranked
}

function withRanks(
  cell: LeaderboardCell,
  ranks: Record<LeadMetric, Map<string, number>>,
  memberKey: string
): LeaderboardRankedCell {
  return {
    ...cell,
    deepFocusRank: ranks.focus.get(memberKey) ?? null,
    totalRank: ranks.total.get(memberKey) ?? null,
  }
}

function earliest(current: number | null, candidate: number): number {
  return current === null ? candidate : Math.min(current, candidate)
}
