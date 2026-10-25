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
  GetBoardsForViewerArgs,
  LeaderboardBoards,
  LeaderboardRow,
  LeaderboardTotal,
} from './types'
import { rankTotals, todaysTotals } from './util'

// The bot's leaderboard read: Today, plus the Week and Month of the focus day in
// one round trip. It passes focus = today, so the boards are the current periods.
// It authenticates with the shared secret — it has no Clerk identity — and
// delegates ranking to ./util. Every timestamp comes from the bot because queries
// must not read the wall clock.
export async function getBoards(ctx: QueryCtx, args: GetBoardsArgs): Promise<LeaderboardBoards> {
  assertBotSecret(args.secret)
  return await buildBoards(ctx, args)
}

// The web's read of the same three boards, for a signed-in member. Same ranking
// and same data as the bot's; only the gate differs. An unauthenticated caller
// gets empty boards rather than an error, so the dashboard can show its empty
// state without special-casing.
export async function getBoardsForViewer(
  ctx: QueryCtx,
  args: GetBoardsForViewerArgs
): Promise<LeaderboardBoards> {
  if (!(await hasViewer(ctx))) return { today: [], day: [], week: [], month: [] }
  return await buildBoards(ctx, args)
}

// The shared computation behind both reads: today's live totals per member, plus
// the Day, Week and Month of the focus day built from past Daily totals merged
// with today's. Auth is the caller's concern; this is pure I/O and ranking over
// the focus day's windows.
async function buildBoards(
  ctx: QueryCtx,
  args: GetBoardsForViewerArgs
): Promise<LeaderboardBoards> {
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

  return {
    today: await resolveNames(ctx, rankTotals(todayTotals)),
    day: await resolveNames(ctx, rankTotals(dayTotals)),
    week: await resolveNames(ctx, rankTotals(weekTotals)),
    month: await resolveNames(ctx, rankTotals(monthTotals)),
  }
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
    existing.userId ??= row.userId
  }

  return [...byMember.values()]
}

// Fill in names for the ranked rows only — the board never fetches users for the
// whole week or month, just the top ten it shows.
async function resolveNames(ctx: QueryCtx, rows: LeaderboardTotal[]): Promise<LeaderboardRow[]> {
  const named: LeaderboardRow[] = []
  for (const row of rows) {
    let name = row.name
    if (name === null) {
      const user = row.userId
        ? await ctx.db.get(row.userId)
        : await ctx.db
            .query('users')
            .withIndex('by_discordId', (q) => q.eq('discordId', row.discordId))
            .first()
      name = user?.name ?? null
    }
    named.push({
      discordId: row.discordId,
      name,
      deepFocusMs: row.deepFocusMs,
      totalMs: row.totalMs,
      online: row.online,
    })
  }
  return named
}
