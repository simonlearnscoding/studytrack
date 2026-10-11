import type { MutationCtx } from '../_generated/server'
import type { RecordVoiceEventArgs, RecordVoiceEventResult } from './types'

// The bot is a trusted external service: it authenticates with a shared secret
// (Convex's documented service-auth pattern). The bot only reports raw voice
// events — all the "does this open or close a session?" logic lives here.
export async function recordVoiceEvent(
  ctx: MutationCtx,
  args: RecordVoiceEventArgs
): Promise<RecordVoiceEventResult> {
  assertBotSecret(args.secret)

  const settings = await getGuildSettings(ctx, args.guildId)
  if (!settings) return { ignored: 'no-guild-config' }

  const transition = getStudyTransition(settings.studyChannelIds, args)

  // Left (or moved out of) a study channel → close any active session.
  if (transition.kind === 'leave') {
    const ended = await closeActiveSessions(ctx, args.discordId)
    return { ended }
  }

  // Entered a study channel → open a session (unless one is already open).
  if (transition.kind === 'enter') {
    return await openSession(ctx, args, transition.channelId)
  }

  return { ignored: 'no-op' }
}

export type StudyTransition =
  { kind: 'enter'; channelId: string } | { kind: 'leave' } | { kind: 'none' }

export function getStudyTransition(
  studyChannelIds: readonly string[],
  { fromChannelId, toChannelId }: Pick<RecordVoiceEventArgs, 'fromChannelId' | 'toChannelId'>
): StudyTransition {
  const study = new Set(studyChannelIds)
  const wasInStudy = fromChannelId !== null && study.has(fromChannelId)
  const isInStudy = toChannelId !== null && study.has(toChannelId)

  if (wasInStudy && !isInStudy) return { kind: 'leave' }
  if (!wasInStudy && isInStudy && toChannelId) return { kind: 'enter', channelId: toChannelId }
  return { kind: 'none' }
}

async function getGuildSettings(ctx: MutationCtx, guildId: string) {
  return await ctx.db
    .query('guildSettings')
    .withIndex('by_guildId', (q) => q.eq('guildId', guildId))
    .unique()
}

async function closeActiveSessions(ctx: MutationCtx, discordId: string) {
  const active = await ctx.db
    .query('studySessions')
    .withIndex('by_discordId', (q) => q.eq('discordId', discordId).eq('status', 'active'))
    .collect()
  const now = Date.now()
  for (const session of active) {
    await ctx.db.patch(session._id, {
      status: 'ended',
      endedAt: now,
      durationMs: now - session.startedAt,
    })
  }
  return active.length
}

async function openSession(
  ctx: MutationCtx,
  args: RecordVoiceEventArgs,
  channelId: string
): Promise<RecordVoiceEventResult> {
  const existing = await ctx.db
    .query('studySessions')
    .withIndex('by_discordId', (q) => q.eq('discordId', args.discordId).eq('status', 'active'))
    .first()
  if (existing) return { ignored: 'already-active' }

  await ctx.db.insert('studySessions', {
    discordId: args.discordId,
    userId: await linkUser(ctx, args.discordId),
    guildId: args.guildId,
    channelId,
    status: 'active',
    startedAt: Date.now(),
  })
  return { started: true }
}

async function linkUser(ctx: MutationCtx, discordId: string) {
  const user = await ctx.db
    .query('users')
    .withIndex('by_discordId', (q) => q.eq('discordId', discordId))
    .first()
  return user?._id
}

// Constant-time compare so the shared secret can't be guessed by timing.
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function assertBotSecret(secret: string) {
  const expected = process.env.BOT_SHARED_SECRET
  if (!expected || !safeEqual(secret, expected)) throw new Error('Unauthorized')
}
