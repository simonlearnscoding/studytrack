import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { getMe } from '../users/service'
import type { Metric, Preference } from './types'

const DEFAULT_PREFERENCE: Preference = { metric: 'focus', isDoneFolded: false }

// The caller's display Preferences. A member who has never chosen — or a
// signed-out reader — gets the defaults, so the dashboard always has a metric
// and the Done group starts expanded.
export async function getMine(ctx: QueryCtx): Promise<Preference> {
  const user = await getMe(ctx)
  if (!user) return DEFAULT_PREFERENCE
  const stored = await find(ctx, user._id)
  return {
    metric: stored?.metric ?? DEFAULT_PREFERENCE.metric,
    isDoneFolded: stored?.isDoneFolded ?? DEFAULT_PREFERENCE.isDoneFolded,
  }
}

// One row per member, created on the first write. Each setting has its own
// mutation, so changing the metric can never clear another Preference.
export async function setMetric(ctx: MutationCtx, metric: Metric): Promise<void> {
  const user = await requireUser(ctx)
  const stored = await find(ctx, user._id)
  if (stored) await ctx.db.patch(stored._id, { metric })
  else await ctx.db.insert('preference', { userId: user._id, metric })
}

// Fold or unfold the Done group for every Day. Patches only this column, so the
// metric survives; a missing row is created on the first write.
export async function setDoneFolded(ctx: MutationCtx, folded: boolean): Promise<void> {
  const user = await requireUser(ctx)
  const stored = await find(ctx, user._id)
  if (stored) await ctx.db.patch(stored._id, { isDoneFolded: folded })
  else
    await ctx.db.insert('preference', {
      userId: user._id,
      metric: 'focus',
      isDoneFolded: folded,
    })
}

async function find(ctx: QueryCtx, userId: Id<'users'>) {
  return await ctx.db
    .query('preference')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .unique()
}

async function requireUser(ctx: MutationCtx): Promise<Doc<'users'>> {
  const user = await getMe(ctx)
  if (!user) throw new Error('Not authenticated')
  return user
}
