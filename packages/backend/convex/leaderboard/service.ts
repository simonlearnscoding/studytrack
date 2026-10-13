import type { QueryCtx } from '../_generated/server'
import { assertBotSecret } from '../bot/util'
import { sumDailyTotals } from '../dailyTotals/service'
import type { DailyTotalSum } from '../dailyTotals/types'
import { groupTodaysMembers } from '../sessions/service'
import type { GetBoardsArgs, LeaderboardBoards, LeaderboardRow, LeaderboardTotal } from './types'
import { rankTotals, todaysTotals } from './util'

// The bot's leaderboard read: Today, the current Week and the current Month in
// one round trip. It authenticates with the shared secret — it has no Clerk
// identity — and delegates ranking to ./util. Every timestamp comes from the bot
// because queries must not read the wall clock.
export async function getBoards(ctx: QueryCtx, args: GetBoardsArgs): Promise<LeaderboardBoards> {
  assertBotSecret(args.secret)

  const members = await groupTodaysMembers(ctx, args.dayStart)
  const todayTotals = todaysTotals(members, args.dayStart, args.now)

  const weekTotals = mergeTotals(
    await sumDailyTotals(ctx, args.weekStart, args.dayStart),
    todayTotals
  )
  const monthTotals = mergeTotals(
    await sumDailyTotals(ctx, args.monthStart, args.dayStart),
    todayTotals
  )

  return {
    today: await resolveNames(ctx, rankTotals(todayTotals)),
    week: await resolveNames(ctx, rankTotals(weekTotals)),
    month: await resolveNames(ctx, rankTotals(monthTotals)),
  }
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
