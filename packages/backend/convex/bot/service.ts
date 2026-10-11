import type { MutationCtx } from '../_generated/server'
import { voiceStrategies } from './strategies'
import { assertBotSecret, getVoiceTransition } from './util'
import type { RecordVoiceEventArgs, RecordVoiceEventResult } from './types'

// The bot is a trusted external service: it authenticates with a shared secret
// (Convex's documented service-auth pattern). It only reports raw voice events —
// the transition logic lives in ./util and the handlers in ./strategies.
export async function recordVoiceEvent(
  ctx: MutationCtx,
  args: RecordVoiceEventArgs
): Promise<RecordVoiceEventResult> {
  assertBotSecret(args.secret)
  const transition = getVoiceTransition(args.from, args.to)
  return await voiceStrategies[transition](ctx, args)
}
