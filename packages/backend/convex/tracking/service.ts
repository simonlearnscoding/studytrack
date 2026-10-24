import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { getMe } from '../users/service'
import type { TrackingStatus } from './types'
import { decideManualStart } from './util'

// The caller's live tracking status: what (if anything) is running for them right
// now. `null` until their Clerk user has been synced to a `users` row.
export async function getMine(ctx: QueryCtx): Promise<TrackingStatus | null> {
  const user = await getMe(ctx)
  if (!user) return null

  const workSession = await findActiveWorkSession(ctx, user)
  if (!workSession) return { mode: null, startedAt: null }

  const partial = await activePartial(ctx, workSession._id)
  return { mode: partial?.mode ?? null, startedAt: partial?.startedAt ?? null }
}

// Start manually tracking study time, for time spent away from Discord. Rejected
// while a Discord voice workSession (or an existing manual one) is active — Discord
// is the trusted witness and manual is only a fallback (ADR-0001).
export async function startManual(ctx: MutationCtx): Promise<void> {
  const user = await requireUser(ctx)
  const workSession = await findActiveWorkSession(ctx, user)
  const action = decideManualStart(
    workSession ? await activePartialMode(ctx, workSession._id) : null
  )

  if (action === 'reject-on-discord') throw new Error('You are already studying in Discord.')
  if (action === 'reject-tracking') throw new Error('You are already tracking.')

  const now = Date.now()
  const workSessionId = await ctx.db.insert('workSession', {
    discordId: user.discordId,
    userId: user._id,
    status: 'active',
    startedAt: now,
  })
  await ctx.db.insert('workSessionPartial', {
    workSessionId,
    discordId: user.discordId,
    userId: user._id,
    mode: 'manual',
    status: 'active',
    startedAt: now,
  })
}

// Stop the member's manual tracking. A no-op when nothing is running, and it
// never touches a Discord workSession — those are closed by the voice strategies.
export async function stopManual(ctx: MutationCtx): Promise<void> {
  const user = await requireUser(ctx)
  const workSession = await findActiveWorkSession(ctx, user)
  if (!workSession) return
  if ((await activePartialMode(ctx, workSession._id)) !== 'manual') return

  const now = Date.now()
  for (const partial of await activePartials(ctx, workSession._id)) {
    await ctx.db.patch(partial._id, {
      status: 'ended',
      endedAt: now,
      durationMs: now - partial.startedAt,
    })
  }
  await ctx.db.patch(workSession._id, { status: 'ended', endedAt: now })
}

async function requireUser(ctx: MutationCtx): Promise<Doc<'users'>> {
  const user = await getMe(ctx)
  if (!user) throw new Error('Not authenticated')
  return user
}

// The member's one active workSession, found by user row first (manual workSessions may
// have no Discord id at all) and then by Discord id as a fallback.
async function findActiveWorkSession(ctx: QueryCtx, user: Doc<'users'>) {
  const byUser = await ctx.db
    .query('workSession')
    .withIndex('by_userId', (q) => q.eq('userId', user._id).eq('status', 'active'))
    .first()
  if (byUser) return byUser
  if (!user.discordId) return null
  return await ctx.db
    .query('workSession')
    .withIndex('by_discordId', (q) => q.eq('discordId', user.discordId).eq('status', 'active'))
    .first()
}

async function activePartial(ctx: QueryCtx, workSessionId: Id<'workSession'>) {
  return await ctx.db
    .query('workSessionPartial')
    .withIndex('by_workSessionId', (q) =>
      q.eq('workSessionId', workSessionId).eq('status', 'active')
    )
    .first()
}

async function activePartialMode(ctx: QueryCtx, workSessionId: Id<'workSession'>) {
  return (await activePartial(ctx, workSessionId))?.mode ?? null
}

async function activePartials(ctx: QueryCtx, workSessionId: Id<'workSession'>) {
  return await ctx.db
    .query('workSessionPartial')
    .withIndex('by_workSessionId', (q) =>
      q.eq('workSessionId', workSessionId).eq('status', 'active')
    )
    .collect()
}
