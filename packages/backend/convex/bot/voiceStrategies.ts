import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { ensureDiscordUser } from '../users/service'
import { getStudyMode, type VoiceTransition } from './util'
import type { RecordVoiceEventArgs, RecordVoiceEventResult } from './types'

// Re-entering within this window continues the previous workSession (as a break)
// instead of starting a new one.
const BREAK_GAP_MS = 30 * 60 * 1000

type VoiceStrategy = (
  ctx: MutationCtx,
  args: RecordVoiceEventArgs
) => Promise<RecordVoiceEventResult>

// `enter` opens a workSession and its first partial; `change` opens a new partial on
// the same workSession; `leave` ends the workSession and its partial; `none` does nothing.
export const voiceStrategies: Record<VoiceTransition, VoiceStrategy> = {
  enter: startWorkSession,
  change: changeState,
  leave: endWorkSession,
  none: noop,
}

async function startWorkSession(
  ctx: MutationCtx,
  args: RecordVoiceEventArgs
): Promise<RecordVoiceEventResult> {
  const channelId = args.to.channelId
  if (!channelId) return noop()

  const userId = await ensureDiscordUser(ctx, args.discordId, args.discordUsername)

  // A workSession may already be running: a lingering Discord one (e.g. the bot
  // missed the leave event) or a manual one the member started on the web.
  const active =
    (await findActiveWorkSession(ctx, args.discordId)) ?? (await findActiveByUser(ctx, userId))
  if (active) {
    // Manual is overtaken, not ended: the same workSession continues in the Discord
    // mode, exactly like any other in-workSession mode change (ADR-0001).
    if ((await activePartialMode(ctx, active._id)) === 'manual') {
      await ctx.db.patch(active._id, { discordId: args.discordId, guildId: args.guildId })
      await closeActivePartials(ctx, active._id)
      await insertPartial(ctx, active._id, userId, args, channelId)
      return { started: true }
    }
    await endWorkSessionRows(ctx, active._id)
  }

  const now = Date.now()

  // Re-entering within 30 minutes continues the previous workSession: record the
  // gap as a `break` partial and reopen the workSession instead of starting a new one.
  const last = await findLastEndedWorkSession(ctx, args.discordId)
  if (last?.endedAt && now - last.endedAt < BREAK_GAP_MS) {
    await ctx.db.patch(last._id, { status: 'active', endedAt: undefined })
    await ctx.db.insert('workSessionPartial', {
      workSessionId: last._id,
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

  const workSessionId = await ctx.db.insert('workSession', {
    discordId: args.discordId,
    userId,
    guildId: args.guildId,
    status: 'active',
    startedAt: now,
  })
  await insertPartial(ctx, workSessionId, userId, args, channelId)
  return { started: true }
}

async function changeState(
  ctx: MutationCtx,
  args: RecordVoiceEventArgs
): Promise<RecordVoiceEventResult> {
  const channelId = args.to.channelId
  if (!channelId) return noop()

  const active = await findActiveWorkSession(ctx, args.discordId)
  if (!active) return await startWorkSession(ctx, args)

  await closeActivePartials(ctx, active._id)
  await insertPartial(ctx, active._id, active.userId, args, channelId)
  return { started: true }
}

async function endWorkSession(
  ctx: MutationCtx,
  args: RecordVoiceEventArgs
): Promise<RecordVoiceEventResult> {
  const active = await findActiveWorkSession(ctx, args.discordId)
  if (!active) return noop()
  const ended = await endWorkSessionRows(ctx, active._id)
  return { ended }
}

async function findActiveWorkSession(ctx: MutationCtx, discordId: string) {
  return await ctx.db
    .query('workSession')
    .withIndex('by_discordId', (q) => q.eq('discordId', discordId).eq('status', 'active'))
    .first()
}

// A manual workSession may have no Discord id, so it is found through its user row.
async function findActiveByUser(ctx: MutationCtx, userId: Id<'users'>) {
  return await ctx.db
    .query('workSession')
    .withIndex('by_userId', (q) => q.eq('userId', userId).eq('status', 'active'))
    .first()
}

async function activePartialMode(ctx: MutationCtx, workSessionId: Id<'workSession'>) {
  const partial = await ctx.db
    .query('workSessionPartial')
    .withIndex('by_workSessionId', (q) =>
      q.eq('workSessionId', workSessionId).eq('status', 'active')
    )
    .first()
  return partial?.mode ?? null
}

async function findLastEndedWorkSession(ctx: MutationCtx, discordId: string) {
  return await ctx.db
    .query('workSession')
    .withIndex('by_discordId', (q) => q.eq('discordId', discordId).eq('status', 'ended'))
    .order('desc')
    .first()
}

async function insertPartial(
  ctx: MutationCtx,
  workSessionId: Id<'workSession'>,
  userId: Id<'users'> | undefined,
  args: RecordVoiceEventArgs,
  channelId: string
) {
  await ctx.db.insert('workSessionPartial', {
    workSessionId,
    discordId: args.discordId,
    userId,
    guildId: args.guildId,
    channelId,
    mode: getStudyMode(args.to),
    status: 'active',
    startedAt: Date.now(),
  })
}

async function closeActivePartials(ctx: MutationCtx, workSessionId: Id<'workSession'>) {
  const active = await ctx.db
    .query('workSessionPartial')
    .withIndex('by_workSessionId', (q) =>
      q.eq('workSessionId', workSessionId).eq('status', 'active')
    )
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

async function endWorkSessionRows(ctx: MutationCtx, workSessionId: Id<'workSession'>) {
  const ended = await closeActivePartials(ctx, workSessionId)
  await ctx.db.patch(workSessionId, { status: 'ended', endedAt: Date.now() })
  return ended
}

function noop(): Promise<RecordVoiceEventResult> {
  return Promise.resolve({ ignored: 'no-op' })
}
