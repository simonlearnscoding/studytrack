/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { internal } from './_generated/api'
import { startOfDay, DASHBOARD_TIME_ZONE } from './sessions/util'
import schema from './schema'
import type { StudyMode } from './bot/types'

const modules = import.meta.glob('./**/*.ts')

const M = 60 * 1000
const H = 60 * 60 * 1000

// 2026-06-15 12:00 Zurich (UTC+2). Local midnight is 2026-06-14 22:00 UTC.
const DAY_START = Date.UTC(2026, 5, 14, 22, 0, 0)
const DAY_END = Date.UTC(2026, 5, 15, 22, 0, 0)
// The Day before it.
const PREV_DAY_START = Date.UTC(2026, 5, 13, 22, 0, 0)

function makeTest() {
  return convexTest(schema, modules)
}

type Test = ReturnType<typeof makeTest>

async function seedSession(
  t: Test,
  opts: {
    discordId?: string
    startedAt: number
    endedAt?: number
    partials: Array<{ mode: StudyMode; startedAt: number; endedAt?: number }>
  }
) {
  await t.run(async (ctx) => {
    let userId: Awaited<ReturnType<typeof ctx.db.insert<'users'>>> | undefined
    if (opts.discordId) {
      const existing = await ctx.db
        .query('users')
        .withIndex('by_discordId', (q) => q.eq('discordId', opts.discordId))
        .first()
      userId =
        existing?._id ??
        (await ctx.db.insert('users', {
          discordId: opts.discordId,
          name: opts.discordId,
          createdAt: opts.startedAt,
        }))
    }

    const sessionId = await ctx.db.insert('session', {
      discordId: opts.discordId,
      userId,
      status: opts.endedAt === undefined ? 'active' : 'ended',
      startedAt: opts.startedAt,
      endedAt: opts.endedAt,
    })

    for (const partial of opts.partials) {
      await ctx.db.insert('sessionPartial', {
        sessionId,
        discordId: opts.discordId,
        userId,
        channelId: partial.mode === 'break' ? undefined : 'chan-a',
        mode: partial.mode,
        status: partial.endedAt === undefined ? 'active' : 'ended',
        startedAt: partial.startedAt,
        endedAt: partial.endedAt,
        durationMs: partial.endedAt === undefined ? undefined : partial.endedAt - partial.startedAt,
      })
    }
  })
}

async function totals(t: Test) {
  return await t.run(async (ctx) => await ctx.db.query('dailyTotal').collect())
}

describe('dailyTotals.rollupDay', () => {
  it('counts one ended camera partial as Study, Deep focus and Total time', async () => {
    const t = makeTest()
    const start = DAY_START + 2 * H
    await seedSession(t, {
      discordId: 'ada',
      startedAt: start,
      endedAt: start + 30 * M,
      partials: [{ mode: 'camera', startedAt: start, endedAt: start + 30 * M }],
    })

    await t.mutation(internal.dailyTotals.rollupDay, { dayStart: DAY_START })

    const rows = await totals(t)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      memberKey: 'ada',
      discordId: 'ada',
      dayStart: DAY_START,
      studyMs: 30 * M,
      deepFocusMs: 30 * M,
      totalMs: 30 * M,
    })
  })

  it('adds a Pause to Total time only', async () => {
    const t = makeTest()
    const start = DAY_START + 1 * H
    await seedSession(t, {
      discordId: 'ada',
      startedAt: start,
      endedAt: start + 2 * H,
      partials: [
        { mode: 'voice', startedAt: start, endedAt: start + 1 * H },
        { mode: 'break', startedAt: start + 1 * H, endedAt: start + 2 * H },
      ],
    })

    await t.mutation(internal.dailyTotals.rollupDay, { dayStart: DAY_START })

    const rows = await totals(t)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      studyMs: 1 * H,
      deepFocusMs: 0,
      totalMs: 2 * H,
    })
  })

  it('splits a 23:30–00:30 session into 30 minutes on each Day', async () => {
    const t = makeTest()
    const start = DAY_START - 30 * M // 2026-06-14 23:30 Zurich
    const end = DAY_START + 30 * M // 2026-06-15 00:30 Zurich
    await seedSession(t, {
      discordId: 'ada',
      startedAt: start,
      endedAt: end,
      partials: [{ mode: 'camera', startedAt: start, endedAt: end }],
    })

    await t.mutation(internal.dailyTotals.rollupDay, { dayStart: PREV_DAY_START })
    await t.mutation(internal.dailyTotals.rollupDay, { dayStart: DAY_START })

    const rows = (await totals(t)).sort((a, b) => a.dayStart - b.dayStart)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      dayStart: PREV_DAY_START,
      studyMs: 30 * M,
      deepFocusMs: 30 * M,
      totalMs: 30 * M,
    })
    expect(rows[1]).toMatchObject({
      dayStart: DAY_START,
      studyMs: 30 * M,
      deepFocusMs: 30 * M,
      totalMs: 30 * M,
    })
  })

  it('counts an active partial up to the Day end', async () => {
    const t = makeTest()
    const start = DAY_END - 30 * M
    await seedSession(t, {
      discordId: 'ada',
      startedAt: start,
      partials: [{ mode: 'voice', startedAt: start }],
    })

    await t.mutation(internal.dailyTotals.rollupDay, { dayStart: DAY_START })

    const rows = await totals(t)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ studyMs: 30 * M, totalMs: 30 * M, deepFocusMs: 0 })
  })

  it('is idempotent: rolling the same Day twice gives the same rows', async () => {
    const t = makeTest()
    const start = DAY_START + 1 * H
    await seedSession(t, {
      discordId: 'ada',
      startedAt: start,
      endedAt: start + 1 * H,
      partials: [{ mode: 'camera', startedAt: start, endedAt: start + 1 * H }],
    })

    await t.mutation(internal.dailyTotals.rollupDay, { dayStart: DAY_START })
    const first = await totals(t)
    await t.mutation(internal.dailyTotals.rollupDay, { dayStart: DAY_START })
    const second = await totals(t)

    const strip = (rows: typeof first) =>
      rows.map(({ _id: _ignored, _creationTime: _c, ...rest }) => rest)
    expect(strip(second)).toEqual(strip(first))
  })

  it('refuses a Day that is not closed', async () => {
    const t = makeTest()
    const today = startOfDay(Date.now(), DASHBOARD_TIME_ZONE)
    await expect(t.mutation(internal.dailyTotals.rollupDay, { dayStart: today })).rejects.toThrow(
      /not closed/
    )
  })

  it('combines manual and voice time for one discordId into one row', async () => {
    const t = makeTest()
    const start = DAY_START + 1 * H
    await seedSession(t, {
      discordId: 'ada',
      startedAt: start,
      endedAt: start + 1 * H,
      partials: [{ mode: 'voice', startedAt: start, endedAt: start + 1 * H }],
    })
    await seedSession(t, {
      discordId: 'ada',
      startedAt: start + 2 * H,
      endedAt: start + 3 * H,
      partials: [{ mode: 'manual', startedAt: start + 2 * H, endedAt: start + 3 * H }],
    })

    await t.mutation(internal.dailyTotals.rollupDay, { dayStart: DAY_START })

    const rows = await totals(t)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ memberKey: 'ada', studyMs: 2 * H })
  })

  it('gives no row to a member with only Pause time', async () => {
    const t = makeTest()
    const start = DAY_START + 1 * H
    await seedSession(t, {
      discordId: 'ada',
      startedAt: start,
      endedAt: start + 1 * H,
      partials: [{ mode: 'break', startedAt: start, endedAt: start + 1 * H }],
    })

    await t.mutation(internal.dailyTotals.rollupDay, { dayStart: DAY_START })

    expect(await totals(t)).toEqual([])
  })

  it('handles the 23-hour spring-forward Day (2026-03-29)', async () => {
    const t = makeTest()
    const dayStart = startOfDay(Date.UTC(2026, 2, 29, 12, 0, 0), DASHBOARD_TIME_ZONE)
    const dayEnd = dayStart + 23 * H
    await seedSession(t, {
      discordId: 'ada',
      startedAt: dayStart,
      endedAt: dayEnd,
      partials: [{ mode: 'voice', startedAt: dayStart, endedAt: dayEnd }],
    })

    await t.mutation(internal.dailyTotals.rollupDay, { dayStart })

    const rows = await totals(t)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ studyMs: 23 * H, totalMs: 23 * H })
  })

  it('handles the 25-hour fall-back Day (2025-10-26)', async () => {
    const t = makeTest()
    const dayStart = startOfDay(Date.UTC(2025, 9, 26, 12, 0, 0), DASHBOARD_TIME_ZONE)
    const dayEnd = dayStart + 25 * H
    await seedSession(t, {
      discordId: 'ada',
      startedAt: dayStart,
      endedAt: dayEnd,
      partials: [{ mode: 'camera', startedAt: dayStart, endedAt: dayEnd }],
    })

    await t.mutation(internal.dailyTotals.rollupDay, { dayStart })

    const rows = await totals(t)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      studyMs: 25 * H,
      deepFocusMs: 25 * H,
      totalMs: 25 * H,
    })
  })
})
