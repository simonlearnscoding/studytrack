import { internalAction, internalMutation, mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import { hasViewer } from './auth/service'
import {
  ensureToday as runEnsureToday,
  readToday,
  storeQuote as runStoreQuote,
} from './quotes/service'
import { fetchArgs, storeArgs } from './quotes/types'
import { parseZenQuote } from './quotes/util'

const ZEN_QUOTES_TODAY = 'https://zenquotes.io/api/today'

// The header's read: the latest Day's quote, or null when signed out / before the
// first fetch. Live and reactive — a new Day's quote appears without a reload.
export const today = query({
  args: {},
  handler: async (ctx) => readToday(ctx),
})

// Signed-in clients call this when the header renders before the first fetch, so
// a fresh deploy (or a missed cron) fills a blank header without waiting an hour.
// Idempotent, so many clients racing on the same empty Day is harmless.
export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    if (!(await hasViewer(ctx))) return
    await runEnsureToday(ctx)
  },
})

// Cron entry: fill today's quote if missing (and self-heal a missed Day).
export const ensureToday = internalMutation({
  args: {},
  handler: async (ctx) => {
    await runEnsureToday(ctx)
  },
})

// The action's write, kept separate so the fetch can retry without a second row.
export const storeQuote = internalMutation({
  args: storeArgs.fields,
  handler: async (ctx, args) => {
    await runStoreQuote(ctx, args)
  },
})

// Fetch one Day's quote from ZenQuotes and store it. Best-effort: a network
// failure (or an unparseable body) returns silently, and the next hourly ensure
// retries. The default runtime has `fetch`, so no `"use node"` is needed.
export const fetchToday = internalAction({
  args: fetchArgs.fields,
  handler: async (ctx, args) => {
    let payload: unknown
    try {
      const res = await fetch(ZEN_QUOTES_TODAY)
      if (!res.ok) return
      payload = await res.json()
    } catch {
      return
    }

    const quote = parseZenQuote(payload)
    if (!quote) return

    await ctx.runMutation(internal.quotes.storeQuote, { dayStart: args.dayStart, ...quote })
  },
})
