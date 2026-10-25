import type { QueryCtx } from '../_generated/server'
import { hasViewer } from '../auth/service'
import { assertBotSecret } from '../bot/util'
import { sumDailyTotals } from '../dailyTotals/service'
import type { DailyTotalSum } from '../dailyTotals/types'
import { groupTodaysMembers } from '../workSessions/service'
import {
  DASHBOARD_TIME_ZONE,
  nextDayStart,
  nextMonthStart,
  nextWeekStart,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '../workSessions/util'
import type {
  GetBoardsArgs,
  GetLeaderboardTableForViewerArgs,
  LeaderboardBoards,
  LeaderboardPeriodTotals,
  LeaderboardRow,
  LeaderboardTableRow,
  LeaderboardTableTotal,
  LeaderboardTotal,
} from './types'
import { buildTableRows, rankTotals, todaysTotals } from './util'

// The bot's leaderboard read: Today, plus the Week and Month of the focus day in
// one round trip. It passes focus = today, so the boards are the current periods.
// It authenticates with the shared secret — it has no Clerk identity — and
// delegates ranking to ./util. Every timestamp comes from the bot because queries
// must not read the wall clock.
export async function getBoards(ctx: QueryCtx, args: GetBoardsArgs): Promise<LeaderboardBoards> {
  assertBotSecret(args.secret)
  const totals = await collectPeriodTotals(ctx, args)
  return {
    today: await resolveNames(ctx, rankTotals(totals.today)),
    day: await resolveNames(ctx, rankTotals(totals.day)),
    week: await resolveNames(ctx, rankTotals(totals.week)),
    month: await resolveNames(ctx, rankTotals(totals.month)),
  }
}

// The web's read: one comparison row per member who reaches a period's top ten
// under either metric, with every period's value present. An unauthenticated
// caller gets an empty table rather than an error, so the dashboard can show its
// empty state without special-casing.
export async function getLeaderboardTableForViewer(
  ctx: QueryCtx,
  args: GetLeaderboardTableForViewerArgs
): Promise<LeaderboardTableRow[]> {
  if (!(await hasViewer(ctx))) return []
  const totals = await collectPeriodTotals(ctx, args)
  return await resolveTableNames(ctx, buildTableRows(totals))
}

// Today's live totals per member, plus the Day, Week and Month of the focus day
// built from past Daily totals merged with today's. Auth is the caller's concern;
// this is the I/O shared by the bot's ranked lists and the web's table.
async function collectPeriodTotals(
  ctx: QueryCtx,
  args: GetLeaderboardTableForViewerArgs
): Promise<LeaderboardPeriodTotals> {
  const todayStart = startOfDay(args.now, DASHBOARD_TIME_ZONE)
  const focusStart = args.focusDayStart
  const focusEnd = nextDayStart(focusStart, DASHBOARD_TIME_ZONE)
  const weekStart = startOfWeek(focusStart, DASHBOARD_TIME_ZONE)
  const weekEnd = nextWeekStart(weekStart, DASHBOARD_TIME_ZONE)
  const monthStart = startOfMonth(focusStart, DASHBOARD_TIME_ZONE)
  const monthEnd = nextMonthStart(monthStart, DASHBOARD_TIME_ZONE)

  const members = await groupTodaysMembers(ctx, todayStart)
  const todayTotals = todaysTotals(members, todayStart, args.now)

  const dayTotals = mergeTotals(
    await sumDailyTotals(ctx, focusStart, focusEnd),
    liveIfContains(focusStart, focusEnd, todayStart, todayTotals)
  )
  const weekTotals = mergeTotals(
    await sumDailyTotals(ctx, weekStart, weekEnd),
    liveIfContains(weekStart, weekEnd, todayStart, todayTotals)
  )
  const monthTotals = mergeTotals(
    await sumDailyTotals(ctx, monthStart, monthEnd),
    liveIfContains(monthStart, monthEnd, todayStart, todayTotals)
  )

  return { today: todayTotals, day: dayTotals, week: weekTotals, month: monthTotals }
}

// Today's still-running totals are merged into a window only when that window
// contains today's Day — so the current Week and Month stay live, while past and
// future periods are stable sums.
function liveIfContains(
  windowStart: number,
  windowEnd: number,
  dayStart: number,
  todayTotals: LeaderboardTotal[]
): LeaderboardTotal[] {
  return dayStart >= windowStart && dayStart < windowEnd ? todayTotals : []
}

// Past Daily totals plus today's live totals, summed per member. The daily rows
// carry no names; today's do, so a member who studied today keeps their name.
function mergeTotals(past: DailyTotalSum[], today: LeaderboardTotal[]): LeaderboardTotal[] {
  const byMember = new Map<string, LeaderboardTotal>()

  for (const total of past) {
    byMember.set(total.memberKey, {
      discordId: total.memberKey,
      userId: total.userId,
      name: null,
      image: null,
      deepFocusMs: total.deepFocusMs,
      totalMs: total.totalMs,
      online: false,
    })
  }

  for (const row of today) {
    const existing = byMember.get(row.discordId)
    if (!existing) {
      byMember.set(row.discordId, { ...row })
      continue
    }
    existing.deepFocusMs += row.deepFocusMs
    existing.totalMs += row.totalMs
    existing.online = row.online
    existing.name ??= row.name
    existing.image ??= row.image
    existing.userId ??= row.userId
  }

  return [...byMember.values()]
}

// Fill in names for the ranked rows only — the bot never fetches users for the
// whole week or month, just the ten it shows.
async function resolveNames(ctx: QueryCtx, rows: LeaderboardTotal[]): Promise<LeaderboardRow[]> {
  const named: LeaderboardRow[] = []
  for (const row of rows) {
    const profile = await resolveProfile(ctx, row)
    named.push({
      discordId: row.discordId,
      name: profile.name,
      image: profile.image,
      deepFocusMs: row.deepFocusMs,
      totalMs: row.totalMs,
      online: row.online,
    })
  }
  return named
}

// Same profile lookup for the web table's union rows.
async function resolveTableNames(
  ctx: QueryCtx,
  rows: LeaderboardTableTotal[]
): Promise<LeaderboardTableRow[]> {
  const named: LeaderboardTableRow[] = []
  for (const row of rows) {
    const profile = await resolveProfile(ctx, row)
    named.push({
      discordId: row.discordId,
      name: profile.name,
      image: profile.image,
      day: row.day,
      week: row.week,
      month: row.month,
    })
  }
  return named
}

// Today's live rows already carry the profile; past Daily totals do not, so
// resolve it from the owning user, falling back to the Discord id index.
async function resolveProfile(
  ctx: QueryCtx,
  row: {
    discordId: string
    name: string | null
    image: string | null
    userId: LeaderboardTotal['userId']
  }
): Promise<{ name: string | null; image: string | null }> {
  if (row.name !== null && row.image !== null) return { name: row.name, image: row.image }
  const user = row.userId
    ? await ctx.db.get(row.userId)
    : await ctx.db
        .query('users')
        .withIndex('by_discordId', (q) => q.eq('discordId', row.discordId))
        .first()
  return { name: row.name ?? user?.name ?? null, image: row.image ?? user?.image ?? null }
}
