import { mutation } from './_generated/server'
import { recordVoiceEvent as applyVoiceEvent } from './bot/service'
import { recordVoiceEventArgs } from './bot/types'

// Thin entry: authenticates and delegates. All workSession open/close logic lives in
// ./bot/service; the payload validators live in ./bot/types.
export const recordVoiceEvent = mutation({
  args: recordVoiceEventArgs.fields,
  handler: async (ctx, args) => {
    return await applyVoiceEvent(ctx, args)
  },
})
