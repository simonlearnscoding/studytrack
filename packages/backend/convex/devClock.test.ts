/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'
import { DASHBOARD_TIME_ZONE, startOfDay } from './workSessions/util'

const modules = import.meta.glob('./**/*.ts')

const H = 60 * 60 * 1000
const NOW = Date.UTC(2026, 5, 15, 10, 0, 0)
const DAY = startOfDay(NOW, DASHBOARD_TIME_ZONE)
const ADA = { subject: 'clerk-ada' }

function makeTest() {
  return convexTest(schema, modules)
}

type Test = ReturnType<typeof makeTest>

async function seedUser(t: Test) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      clerkUserId: ADA.subject,
      name: 'Ada',
      createdAt: NOW,
    })
  })
}

function useFakeNow() {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('devClock deployment guard', () => {
  it('is off and refuses writes outside a dev deployment', async () => {
    useFakeNow()
    vi.stubEnv('DEV_AUTH_BYPASS', '')
    const t = makeTest()

    expect(await t.query(api.devClock.get, {})).toEqual({ enabled: false, offsetMs: 0 })
    await expect(t.mutation(api.devClock.setOffset, { offsetMs: H })).rejects.toThrow(
      /dev clock is disabled/
    )
  })

  it('ignores a stored offset outside a dev deployment', async () => {
    useFakeNow()
    vi.stubEnv('DEV_AUTH_BYPASS', '')
    const t = makeTest()
    await seedUser(t)
    await t.run(async (ctx) => {
      await ctx.db.insert('devClock', { singleton: 'global', offsetMs: 2 * H })
    })

    expect(await t.query(api.devClock.get, {})).toEqual({ enabled: false, offsetMs: 0 })
    // With the +2h offset applied this start would be in the past; the real
    // clock accepts it, so production writes cannot be moved by the row.
    await t.withIdentity(ADA).mutation(api.planBlocks.create, {
      dayStart: DAY,
      title: 'Read',
      plannedStart: DAY + 13 * H,
      plannedEnd: DAY + 14 * H,
    })
  })

  it('reads and moves the offset on a dev deployment', async () => {
    useFakeNow()
    vi.stubEnv('DEV_AUTH_BYPASS', '1')
    const t = makeTest()

    expect(await t.query(api.devClock.get, {})).toEqual({ enabled: true, offsetMs: 0 })
    await t.mutation(api.devClock.setOffset, { offsetMs: 90 * 60_000 })
    expect(await t.query(api.devClock.get, {})).toEqual({
      enabled: true,
      offsetMs: 90 * 60_000,
    })
  })
})

describe('devClock interactive writes', () => {
  it('moves the plan-create past floor with the fake clock', async () => {
    useFakeNow()
    vi.stubEnv('DEV_AUTH_BYPASS', '1')
    const t = makeTest()
    await seedUser(t)
    await t.mutation(api.devClock.setOffset, { offsetMs: 2 * H })

    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.create, {
        dayStart: DAY,
        title: 'Read',
        plannedStart: DAY + 13 * H,
        plannedEnd: DAY + 14 * H,
      })
    ).rejects.toThrow(/past/)

    await t.withIdentity(ADA).mutation(api.planBlocks.create, {
      dayStart: DAY,
      title: 'Read',
      plannedStart: DAY + 14 * H,
      plannedEnd: DAY + 15 * H,
    })
    const plans = await t.run(async (ctx) => await ctx.db.query('planBlock').collect())
    expect(plans).toHaveLength(1)
  })

  it('stamps completions at the fake now', async () => {
    useFakeNow()
    vi.stubEnv('DEV_AUTH_BYPASS', '1')
    const t = makeTest()
    await seedUser(t)
    await t.withIdentity(ADA).mutation(api.tasks.create, {
      title: 'Read',
      plannedAt: DAY,
    })
    await t.mutation(api.devClock.setOffset, { offsetMs: H })

    const [task] = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: task.id,
      focusDayStart: DAY,
    })

    const [done] = await t.run(async (ctx) => await ctx.db.query('task').collect())
    expect(done).toMatchObject({ done: true, completedAt: NOW + H })
  })
})
