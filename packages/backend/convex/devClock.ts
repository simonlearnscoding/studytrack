import { mutation, query } from './_generated/server'
import { getClock, setClockOffset } from './devClock/service'
import { setOffsetArgs } from './devClock/types'

// Thin entry: the handlers only delegate to ./devClock/service. Both are refused
// outside a dev deployment there, so production can neither read nor move the
// clock.
export const get = query({
  args: {},
  handler: async (ctx) => getClock(ctx),
})

export const setOffset = mutation({
  args: setOffsetArgs.fields,
  handler: async (ctx, args) => {
    await setClockOffset(ctx, args.offsetMs)
  },
})
