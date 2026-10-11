import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { ensureDiscordUser } from '../users/service'
import { getStudyMode, type VoiceTransition } from './util'
import type { RecordVoiceEventArgs, RecordVoiceEventResult } from './types'

// Re-entering within this window continues the previous session (as a break)
// instead of starting a new one.
const BREAK_GAP_MS = 30 * 60 * 1000

type VoiceStrategy = (
  ctx: MutationCtx,
  args: RecordVoiceEventArgs
) => Promise<RecordVoiceEventResult>

// `enter` opens a session and its first partial; `change` opens a new partial on
// the same session; `leave` ends the session and its partial; `none` does nothing.
export const voiceStrategies: Record<VoiceTransition, VoiceStrategy> = {
  enter: startSession,
  change: changeState,
  leave: endSession,
  none: noop,
}

async function startSession(
  ctx: MutationCtx,
  args: RecordVoiceEventArgs
): Promise<RecordVoiceEventResult> {
  const channelId = args.to.channelId
  if (!channelId) return noop()

  const userId = await ensureDiscordUser(ctx, args.discordId, args.discordUsername)

  // A session may already be running: a lingering Discord one (e.g. the bot
  // missed the leave event) or a manual one the member started on the web.
  const active =
    (await findActiveSession(ctx, args.discordId)) ?? (await findActiveByUser(ctx, userId))
  if (active) {
    // Manual is overtaken, not ended: the same session continues in the Discord
    // mode, exactly like any other in-session mode change (ADR-0001).
    if ((await activePartialMode(ctx, active._id)) === 'manual') {
      await ctx.db.patch(active._id, { discordId: args.discordId, guildId: args.guildId })
      await closeActivePartials(ctx, active._id)
      await insertPartial(ctx, active._id, userId, args, channelId)
      return { started: true }
    }
    await endSessionRows(ctx, active._id)
  }

  const now = Date.now()

  // Re-entering within 30 minutes continues the previous session: record the
  // gap as a `break` partial and reopen the session instead of starting a new one.
  const last = await findLastEndedSession(ctx, args.discordId)
  if (last?.endedAt && now - last.endedAt < BREAK_GAP_MS) {
    await ctx.db.patch(last._id, { status: 'active', endedAt: undefined })
    await ctx.db.insert('sessionPartial', {
      sessionId: last._id,
      discordId: args.discordId,
      userId,
      guildId: args.guildId,
      channelId: undefined,
      mode: 'break',
      status: 'ended',
      startedAt: last.endedAt,
      endedAt: now,
      durationMs: now - last.endedAt,
    })
    await insertPartial(ctx, last._id, userId, args, channelId)
    return { started: true }
  }

  const sessionId = await ctx.db.insert('session', {
    discordId: args.discordId,
    userId,
    guildId: args.guildId,
    status: 'active',
    startedAt: now,
  })
  await insertPartial(ctx, sessionId, userId, args, channelId)
  return { started: true }
}

async function changeState(
  ctx: MutationCtx,
  args: RecordVoiceEventArgs
): Promise<RecordVoiceEventResult> {
  const channelId = args.to.channelId
  if (!channelId) return noop()

  const active = await findActiveSession(ctx, args.discordId)
  if (!active) return await startSession(ctx, args)

  await closeActivePartials(ctx, active._id)
  await insertPartial(ctx, active._id, active.userId, args, channelId)
  return { started: true }
}

async function endSession(
  ctx: MutationCtx,
  args: RecordVoiceEventArgs
): Promise<RecordVoiceEventResult> {
  const active = await findActiveSession(ctx, args.discordId)
  if (!active) return noop()
  const ended = await endSessionRows(ctx, active._id)
  return { ended }
}

async function findActiveSession(ctx: MutationCtx, discordId: string) {
  return await ctx.db
    .query('session')
    .withIndex('by_discordId', (q) => q.eq('discordId', discordId).eq('status', 'active'))
    .first()
}

// A manual session may have no Discord id, so it is found through its user row.
async function findActiveByUser(ctx: MutationCtx, userId: Id<'users'>) {
  return await ctx.db
    .query('session')
    .withIndex('by_userId', (q) => q.eq('userId', userId).eq('status', 'active'))
    .first()
}

async function activePartialMode(ctx: MutationCtx, sessionId: Id<'session'>) {
  const partial = await ctx.db
    .query('sessionPartial')
    .withIndex('by_sessionId', (q) => q.eq('sessionId', sessionId).eq('status', 'active'))
    .first()
  return partial?.mode ?? null
}

async function findLastEndedSession(ctx: MutationCtx, discordId: string) {
  return await ctx.db
    .query('session')
    .withIndex('by_discordId', (q) => q.eq('discordId', discordId).eq('status', 'ended'))
    .order('desc')
    .first()
}

async function insertPartial(
  ctx: MutationCtx,
  sessionId: Id<'session'>,
  userId: Id<'users'> | undefined,
  args: RecordVoiceEventArgs,
  channelId: string
) {
  await ctx.db.insert('sessionPartial', {
    sessionId,
    discordId: args.discordId,
    userId,
    guildId: args.guildId,
    channelId,
    mode: getStudyMode(args.to),
    status: 'active',
    startedAt: Date.now(),
  })
}

async function closeActivePartials(ctx: MutationCtx, sessionId: Id<'session'>) {
  const active = await ctx.db
    .query('sessionPartial')
    .withIndex('by_sessionId', (q) => q.eq('sessionId', sessionId).eq('status', 'active'))
    .collect()
  const now = Date.now()
  for (const partial of active) {
    await ctx.db.patch(partial._id, {
      status: 'ended',
      endedAt: now,
      durationMs: now - partial.startedAt,
    })
  }
  return active.length
}

async function endSessionRows(ctx: MutationCtx, sessionId: Id<'session'>) {
  const ended = await closeActivePartials(ctx, sessionId)
  await ctx.db.patch(sessionId, { status: 'ended', endedAt: Date.now() })
  return ended
}

function noop(): Promise<RecordVoiceEventResult> {
  return Promise.resolve({ ignored: 'no-op' })
}
