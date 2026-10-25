import { internal } from '../_generated/api'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { hasViewer } from '../auth/service'
import { DASHBOARD_TIME_ZONE, startOfDay } from '../workSessions/util'
import type { DailyQuote, StoreArgs } from './types'

// The latest stored quote, for the signed-in header. Reads only what the cron has
// materialized — never the clock — so the read stays deterministic. Returns null
// when unauthenticated or before the first fetch, like the other member reads.
export async function readToday(ctx: QueryCtx): Promise<DailyQuote | null> {
  if (!(await hasViewer(ctx))) return null

  const row = await ctx.db.query('dailyQuote').withIndex('by_dayStart').order('desc').first()
  return row ? { text: row.text, author: row.author } : null
}

// Fill today's quote if it is missing, chaining the network fetch through the
// scheduler so the cron's transaction stays pure. Runs hourly, so a Day that the
// first attempt missed (a failed fetch, a rollover mid-hour) self-heals.
export async function ensureToday(ctx: MutationCtx): Promise<void> {
  const dayStart = startOfDay(Date.now(), DASHBOARD_TIME_ZONE)
  const existing = await ctx.db
    .query('dailyQuote')
    .withIndex('by_dayStart', (q) => q.eq('dayStart', dayStart))
    .first()
  if (existing) return

  await ctx.scheduler.runAfter(0, internal.quotes.fetchToday, { dayStart })
}

// Upsert the Day's quote. Idempotent: a retry for the same Day overwrites in place
// rather than inserting a second row.
export async function storeQuote(ctx: MutationCtx, args: StoreArgs): Promise<void> {
  const existing = await ctx.db
    .query('dailyQuote')
    .withIndex('by_dayStart', (q) => q.eq('dayStart', args.dayStart))
    .first()

  if (existing) {
    await ctx.db.patch(existing._id, { text: args.text, author: args.author })
    return
  }
  await ctx.db.insert('dailyQuote', {
    dayStart: args.dayStart,
    text: args.text,
    author: args.author,
  })
}
