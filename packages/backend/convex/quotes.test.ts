/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from './_generated/api'
import schema from './schema'
import { DASHBOARD_TIME_ZONE, startOfDay } from './workSessions/util'

const modules = import.meta.glob('./**/*.ts')

const DAY = 1_700_000_000_000

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('quotes.today', () => {
  it('returns null when signed out', async () => {
    const t = convexTest(schema, modules)
    expect(await t.query(api.quotes.today, {})).toBeNull()
  })

  it('reads signed-out when the dev bypass is set', async () => {
    vi.stubEnv('DEV_AUTH_BYPASS', '1')
    const t = convexTest(schema, modules)
    await t.mutation(internal.quotes.storeQuote, { dayStart: DAY, text: 'Dev', author: 'A' })

    expect(await t.query(api.quotes.today, {})).toEqual({ text: 'Dev', author: 'A' })
  })

  it('returns the latest stored quote to a signed-in member', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.quotes.storeQuote, { dayStart: DAY, text: 'Older', author: 'A' })
    await t.mutation(internal.quotes.storeQuote, {
      dayStart: DAY + 86_400_000,
      text: 'Newer',
      author: 'B',
    })

    const quote = await t.withIdentity({ subject: 'clerk-1' }).query(api.quotes.today, {})
    expect(quote).toEqual({ text: 'Newer', author: 'B' })
  })
})

describe('quotes.ensure', () => {
  it('does nothing when signed out', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.quotes.ensure, {})

    const rows = await t.run((ctx) => ctx.db.query('dailyQuote').collect())
    expect(rows).toHaveLength(0)
  })

  it('seeds the Day signed-out when the dev bypass is set', async () => {
    vi.useFakeTimers()
    vi.stubEnv('DEV_AUTH_BYPASS', '1')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => [{ q: 'Dev', a: 'A' }] }))
    )
    const t = convexTest(schema, modules)

    await t.mutation(api.quotes.ensure, {})
    await t.finishAllScheduledFunctions(vi.runAllTimers)

    const rows = await t.run((ctx) => ctx.db.query('dailyQuote').collect())
    expect(rows).toHaveLength(1)
  })

  it('fetches and stores the Day when a signed-in member finds none', async () => {
    vi.useFakeTimers()
    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => [{ q: ' Stay the course. ', a: 'Someone' }],
    }))
    vi.stubGlobal('fetch', mockFetch)
    const t = convexTest(schema, modules)

    await t.withIdentity({ subject: 'clerk-1' }).mutation(api.quotes.ensure, {})
    await t.finishAllScheduledFunctions(vi.runAllTimers)

    expect(mockFetch).toHaveBeenCalled()
    const rows = await t.run((ctx) => ctx.db.query('dailyQuote').collect())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ text: 'Stay the course.', author: 'Someone' })
  })

  it('leaves an existing Day untouched', async () => {
    vi.useFakeTimers()
    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => [{ q: 'Replacement', a: 'B' }],
    }))
    vi.stubGlobal('fetch', mockFetch)
    const t = convexTest(schema, modules)
    const today = startOfDay(Date.now(), DASHBOARD_TIME_ZONE)
    await t.mutation(internal.quotes.storeQuote, { dayStart: today, text: 'Kept', author: 'A' })

    await t.withIdentity({ subject: 'clerk-1' }).mutation(api.quotes.ensure, {})
    await t.finishAllScheduledFunctions(vi.runAllTimers)

    expect(mockFetch).not.toHaveBeenCalled()
    const rows = await t.run((ctx) => ctx.db.query('dailyQuote').collect())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ text: 'Kept', author: 'A' })
  })
})

describe('quotes.storeQuote', () => {
  it('upserts a Day in place rather than inserting twice', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.quotes.storeQuote, { dayStart: DAY, text: 'First', author: 'A' })
    await t.mutation(internal.quotes.storeQuote, { dayStart: DAY, text: 'Second', author: 'B' })

    const rows = await t.run(async (ctx) => await ctx.db.query('dailyQuote').collect())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ dayStart: DAY, text: 'Second', author: 'B' })
  })
})
