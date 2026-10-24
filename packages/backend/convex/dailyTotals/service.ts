import type { Doc, Id } from '../_generated/dataModel'
import { internal } from '../_generated/api'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { isDeepFocus, todaysTotals } from '../leaderboard/util'
import { groupTodaysMembers } from '../workSessions/service'
import {
  DASHBOARD_TIME_ZONE,
  nextDayStart,
  previousDayStart,
  startOfDay,
} from '../workSessions/util'
import { getMe } from '../users/service'
import type { DailyTotalCalendarDay, DailyTotalDay, DailyTotalSum } from './types'
import { overlapMs } from './util'

const HOUR_MS = 60 * 60 * 1000
// No partial runs longer than about 9 hours (the stale sweep closes at 8), so a
// partial overlapping the Day must have started within this window before it.
const TWELVE_HOURS_MS = 12 * HOUR_MS

// Bounded reads. A Day that trips either cap throws instead of truncating
// silently (see ST-11); the numbers are never allowed to be quietly wrong.
const MAX_PARTIALS_PER_DAY = 5000
const MAX_SUM_ROWS = 10000
// The heatmap asks for 53 weeks (371 Days), so 400 rows is headroom. A longer
// range throws rather than truncating silently, matching the reads above.
const MAX_MINE_ROWS = 400
// A Month is at most 31 Days; 62 gives headroom for a stray row or two and still
// refuses anything that is not a single month.
const MAX_CALENDAR_ROWS = 62

// Recompute one closed Day's totals for every member that studied in it.
// Idempotent: it clears the Day's rows and inserts fresh ones, so re-running
// after a late stale-workSession close corrects the numbers.
export async function rollupDay(ctx: MutationCtx, dayStart: number): Promise<void> {
  const dayEnd = nextDayStart(dayStart, DASHBOARD_TIME_ZONE)
  if (Date.now() < dayEnd) throw new Error('dailyTotals: day is not closed')

  const partials = await ctx.db
    .query('workSessionPartial')
    .withIndex('by_startedAt', (q) =>
      q.gte('startedAt', dayStart - TWELVE_HOURS_MS).lt('startedAt', dayEnd)
    )
    .take(MAX_PARTIALS_PER_DAY)
  if (partials.length >= MAX_PARTIALS_PER_DAY) {
    throw new Error('dailyTotals: day too large to roll up')
  }

  const byMember = await sumMembers(ctx, partials, dayStart, dayEnd)

  const existing = await ctx.db
    .query('dailyTotal')
    .withIndex('by_dayStart', (q) => q.eq('dayStart', dayStart))
    .collect()
  for (const row of existing) await ctx.db.delete(row._id)

  for (const [memberKey, total] of byMember) {
    if (total.totalMs <= 0) continue
    await ctx.db.insert('dailyTotal', {
      memberKey,
      discordId: total.discordId ?? undefined,
      userId: total.userId ?? undefined,
      dayStart,
      studyMs: total.studyMs,
      deepFocusMs: total.deepFocusMs,
      totalMs: total.totalMs,
    })
  }
}

// Re-roll yesterday and the Day before: the hourly stale sweep can close a
// workSession late, so the two most recent closed Days are never final.
export async function rollupRecent(ctx: MutationCtx): Promise<void> {
  const today = startOfDay(Date.now(), DASHBOARD_TIME_ZONE)
  const yesterday = previousDayStart(today, DASHBOARD_TIME_ZONE)
  const dayBefore = previousDayStart(yesterday, DASHBOARD_TIME_ZONE)
  await rollupDay(ctx, dayBefore)
  await rollupDay(ctx, yesterday)
}

// Fill in every past Day, one per invocation, chaining the next through the
// scheduler so no single transaction does unbounded work. With no argument it
// starts at the Day of the earliest partial.
export async function backfill(ctx: MutationCtx, dayStart?: number): Promise<void> {
  const today = startOfDay(Date.now(), DASHBOARD_TIME_ZONE)
  const yesterday = previousDayStart(today, DASHBOARD_TIME_ZONE)

  let start = dayStart
  if (start === undefined) {
    const earliest = await ctx.db
      .query('workSessionPartial')
      .withIndex('by_startedAt')
      .order('asc')
      .first()
    if (!earliest) return
    start = startOfDay(earliest.startedAt, DASHBOARD_TIME_ZONE)
  }
  if (start > yesterday) return

  await rollupDay(ctx, start)
  const next = nextDayStart(start, DASHBOARD_TIME_ZONE)
  if (next <= yesterday) {
    await ctx.scheduler.runAfter(0, internal.dailyTotals.backfill, { dayStart: next })
  }
}

// Per-member sums over the Days in [fromDayStart, toDayStart). The read helper
// the weekly and monthly boards build on. Throws if the range would truncate.
export async function sumDailyTotals(
  ctx: QueryCtx,
  fromDayStart: number,
  toDayStart: number
): Promise<DailyTotalSum[]> {
  const rows = await ctx.db
    .query('dailyTotal')
    .withIndex('by_dayStart', (q) => q.gte('dayStart', fromDayStart).lt('dayStart', toDayStart))
    .take(MAX_SUM_ROWS)
  if (rows.length >= MAX_SUM_ROWS) throw new Error('dailyTotals: range too large to sum')

  const byMember = new Map<string, DailyTotalSum>()
  for (const row of rows) {
    const total = byMember.get(row.memberKey) ?? {
      memberKey: row.memberKey,
      discordId: null,
      userId: null,
      studyMs: 0,
      deepFocusMs: 0,
      totalMs: 0,
    }
    total.studyMs += row.studyMs
    total.deepFocusMs += row.deepFocusMs
    total.totalMs += row.totalMs
    total.discordId ??= row.discordId ?? null
    total.userId ??= row.userId ?? null
    byMember.set(row.memberKey, total)
  }
  return [...byMember.values()]
}

// The caller's own Daily totals from `fromDayStart` onwards, oldest first — the
// web heatmap and Streak read (ST-13/ST-14). Private: it resolves the caller's
// own member key (the same `discordId ?? String(userId)` rule the rollup writes
// with) and never returns another member's rows. Returns nothing when
// unauthenticated, like the other member reads.
export async function listMine(ctx: QueryCtx, fromDayStart: number): Promise<DailyTotalDay[]> {
  const user = await getMe(ctx)
  if (!user) return []

  const memberKey = user.discordId ?? String(user._id)
  const rows = await ctx.db
    .query('dailyTotal')
    .withIndex('by_memberKey', (q) => q.eq('memberKey', memberKey).gte('dayStart', fromDayStart))
    .take(MAX_MINE_ROWS)
  if (rows.length >= MAX_MINE_ROWS) throw new Error('dailyTotals: range too large to read')

  return rows.map((row) => ({ dayStart: row.dayStart, studyMs: row.studyMs }))
}

// The caller's own Daily totals for one Month window, as the web calendar reads
// them. Today's row is a read-time merge from today's WorkSessions and partials, using
// the same Deep focus / Total rules as the leaderboard, clipped to [today, now).
// It is never written to `dailyTotal`; the rollup owns closed Days.
export async function getCalendar(
  ctx: QueryCtx,
  fromDayStart: number,
  toDayStart: number,
  now: number
): Promise<DailyTotalCalendarDay[]> {
  const user = await getMe(ctx)
  if (!user) return []

  const memberKey = user.discordId ?? String(user._id)
  const todayStart = startOfDay(now, DASHBOARD_TIME_ZONE)

  const rows = await ctx.db
    .query('dailyTotal')
    .withIndex('by_memberKey', (q) =>
      q.eq('memberKey', memberKey).gte('dayStart', fromDayStart).lt('dayStart', toDayStart)
    )
    .take(MAX_CALENDAR_ROWS)
  if (rows.length >= MAX_CALENDAR_ROWS) throw new Error('dailyTotals: month too large to read')

  // A stored row for today (only possible from a manual backfill) is replaced by
  // the live row below, never added to it.
  const days = rows
    .filter((row) => row.dayStart !== todayStart)
    .map((row) => ({
      dayStart: row.dayStart,
      deepFocusMs: row.deepFocusMs,
      totalMs: row.totalMs,
    }))

  if (todayStart >= fromDayStart && todayStart < toDayStart) {
    const members = await groupTodaysMembers(ctx, todayStart)
    const mine = members.find((member) => member.discordId === memberKey)
    const live = mine ? todaysTotals([mine], todayStart, now)[0] : null
    if (live && (live.deepFocusMs > 0 || live.totalMs > 0)) {
      days.push({ dayStart: todayStart, deepFocusMs: live.deepFocusMs, totalMs: live.totalMs })
    }
  }

  return days.sort((a, b) => a.dayStart - b.dayStart)
}

type MemberTotal = {
  discordId: string | null
  userId: Id<'users'> | null
  studyMs: number
  deepFocusMs: number
  totalMs: number
}

// The Day's totals, keyed by the shared member key. Study time is every
// non-`break` partial; Deep focus is the camera or screen-share modes; Total time
// is a workSession's whole span, counted only for workSessions that have study time in
// the Day, so a member with only Pauses produces no row.
async function sumMembers(
  ctx: MutationCtx,
  partials: Doc<'workSessionPartial'>[],
  dayStart: number,
  dayEnd: number
): Promise<Map<string, MemberTotal>> {
  const partialsByWorkSession = new Map<Id<'workSession'>, Doc<'workSessionPartial'>[]>()
  for (const partial of partials) {
    const list = partialsByWorkSession.get(partial.workSessionId) ?? []
    list.push(partial)
    partialsByWorkSession.set(partial.workSessionId, list)
  }

  const byMember = new Map<string, MemberTotal>()
  for (const [workSessionId, workSessionPartials] of partialsByWorkSession) {
    const workSession = await ctx.db.get(workSessionId)
    if (!workSession) continue

    const memberKey = workSession.discordId ?? String(workSession.userId)
    const total = byMember.get(memberKey) ?? {
      discordId: null,
      userId: null,
      studyMs: 0,
      deepFocusMs: 0,
      totalMs: 0,
    }
    total.discordId ??= workSession.discordId ?? null
    total.userId ??= workSession.userId ?? workSessionPartials.find((p) => p.userId)?.userId ?? null

    let studyMs = 0
    for (const partial of workSessionPartials) {
      const clipped = overlapMs(partial.startedAt, partial.endedAt ?? dayEnd, dayStart, dayEnd)
      if (partial.mode !== 'break') studyMs += clipped
      if (isDeepFocus(partial)) total.deepFocusMs += clipped
    }

    total.studyMs += studyMs
    if (studyMs > 0) {
      total.totalMs += overlapMs(
        workSession.startedAt,
        workSession.endedAt ?? dayEnd,
        dayStart,
        dayEnd
      )
    }
    byMember.set(memberKey, total)
  }

  return byMember
}
