/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'
import { DASHBOARD_TIME_ZONE, nextDayStart, startOfDay } from './workSessions/util'

const modules = import.meta.glob('./**/*.ts')

const H = 60 * 60 * 1000
// Local noon on 2026-06-15, so "today" is unambiguous and a 14:00 plan is ahead.
const NOW = Date.UTC(2026, 5, 15, 10, 0, 0)
const DAY = startOfDay(NOW, DASHBOARD_TIME_ZONE)
const START = DAY + 14 * H
const END = DAY + 15 * H

const ADA = { subject: 'clerk-ada' }
const BOB = { subject: 'clerk-bob' }

function makeTest() {
  return convexTest(schema, modules)
}

type Test = ReturnType<typeof makeTest>

async function seedUser(t: Test, identity: { subject: string }, name: string) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      clerkUserId: identity.subject,
      name,
      createdAt: NOW,
    })
  })
}

function plan(identity: { subject: string }, over: { start?: number; end?: number } = {}) {
  return {
    dayStart: DAY,
    plannedStart: over.start ?? START,
    plannedEnd: over.end ?? END,
  }
}

async function rowsOf(t: Test) {
  return await t.run(async (ctx) => await ctx.db.query('planBlock').collect())
}

describe('planBlocks.create', () => {
  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterAll(() => {
    vi.useRealTimers()
  })

  it('rejects an unauthenticated caller', async () => {
    const t = makeTest()
    await expect(t.mutation(api.planBlocks.create, plan(ADA))).rejects.toThrow(/Not authenticated/)
  })

  it('stores the drag window and shows it on the member card', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')

    await t.withIdentity(ADA).mutation(api.planBlocks.create, plan(ADA))

    const [row] = await rowsOf(t)
    expect(row).toMatchObject({ dayStart: DAY, plannedStart: START, plannedEnd: END })

    const res = await t
      .withIdentity(ADA)
      .query(api.workSessions.getTodaysActivitiesForDashboard, { dayStart: DAY })
    expect(res).toHaveLength(1)
    expect(res[0]).toMatchObject({
      name: 'Ada',
      online: false,
      workSessions: [],
      planBlocks: [{ id: row._id, startAt: START, endAt: END }],
    })
  })

  it('keeps several plans for one member', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')

    await t.withIdentity(ADA).mutation(api.planBlocks.create, plan(ADA))
    await t
      .withIdentity(ADA)
      .mutation(api.planBlocks.create, plan(ADA, { start: START + 2 * H, end: END + 3 * H }))

    const rows = await rowsOf(t)
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => [row.plannedStart, row.plannedEnd])).toEqual([
      [START, END],
      [START + 2 * H, END + 3 * H],
    ])

    const res = await t
      .withIdentity(ADA)
      .query(api.workSessions.getTodaysActivitiesForDashboard, { dayStart: DAY })
    expect(res[0].planBlocks).toHaveLength(2)
  })

  it('refuses a plan that overlaps an existing one', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await t.withIdentity(ADA).mutation(api.planBlocks.create, plan(ADA))

    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.create, plan(ADA, { start: START + 30 * 60_000 }))
    ).rejects.toThrow(/overlaps/)
    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.create, plan(ADA, { end: END - 30 * 60_000 }))
    ).rejects.toThrow(/overlaps/)

    expect(await rowsOf(t)).toHaveLength(1)
  })

  it('allows plans that only touch at the edge', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')

    await t.withIdentity(ADA).mutation(api.planBlocks.create, plan(ADA))
    await t
      .withIdentity(ADA)
      .mutation(api.planBlocks.create, plan(ADA, { start: END, end: END + H }))

    expect(await rowsOf(t)).toHaveLength(2)
  })

  it('refuses a window that starts in the past', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')

    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.create, plan(ADA, { start: DAY + 11 * H }))
    ).rejects.toThrow(/past/)
  })

  it('refuses a window off the 15-minute grid', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')

    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.create, plan(ADA, { start: START + 60_000 }))
    ).rejects.toThrow(/15-minute/)
  })

  it('refuses a window outside its Day', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    const dayEnd = nextDayStart(DAY, DASHBOARD_TIME_ZONE)

    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.create, plan(ADA, { end: dayEnd + 15 * 60_000 }))
    ).rejects.toThrow(/inside its Day/)
  })

  it('keeps each member under their own plan, public to the room', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await seedUser(t, BOB, 'Bob')

    await t.withIdentity(BOB).mutation(api.planBlocks.create, plan(BOB))

    const res = await t
      .withIdentity(ADA)
      .query(api.workSessions.getTodaysActivitiesForDashboard, { dayStart: DAY })
    expect(res).toHaveLength(1)
    expect(res[0]).toMatchObject({
      name: 'Bob',
      planBlocks: [{ startAt: START, endAt: END }],
    })
  })
})

describe('planBlocks.update', () => {
  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterAll(() => {
    vi.useRealTimers()
  })

  it('moves one edge of an owned plan', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await t.withIdentity(ADA).mutation(api.planBlocks.create, plan(ADA))
    const [row] = await rowsOf(t)

    await t.withIdentity(ADA).mutation(api.planBlocks.update, {
      planBlockId: row._id,
      plannedStart: START + 30 * 60_000,
      plannedEnd: END,
    })

    const [after] = await rowsOf(t)
    expect(after).toMatchObject({ plannedStart: START + 30 * 60_000, plannedEnd: END })
  })

  it('refuses a resize that overlaps a neighbouring plan', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await t.withIdentity(ADA).mutation(api.planBlocks.create, plan(ADA))
    await t
      .withIdentity(ADA)
      .mutation(api.planBlocks.create, plan(ADA, { start: END, end: END + H }))
    const [first] = await rowsOf(t)

    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.update, {
        planBlockId: first._id,
        plannedStart: START,
        plannedEnd: END + 30 * 60_000,
      })
    ).rejects.toThrow(/overlaps/)
  })

  it('refuses to resize another member plan', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await seedUser(t, BOB, 'Bob')
    await t.withIdentity(ADA).mutation(api.planBlocks.create, plan(ADA))
    const [row] = await rowsOf(t)

    await expect(
      t.withIdentity(BOB).mutation(api.planBlocks.update, {
        planBlockId: row._id,
        plannedStart: START,
        plannedEnd: END + H,
      })
    ).rejects.toThrow(/Plan block not found/)
  })

  it('refuses a resize that starts in the past', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await t.withIdentity(ADA).mutation(api.planBlocks.create, plan(ADA))
    const [row] = await rowsOf(t)

    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.update, {
        planBlockId: row._id,
        plannedStart: DAY + 11 * H,
        plannedEnd: END,
      })
    ).rejects.toThrow(/past/)
  })
})

describe('planBlocks.remove', () => {
  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterAll(() => {
    vi.useRealTimers()
  })

  it('deletes an owned plan', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await t.withIdentity(ADA).mutation(api.planBlocks.create, plan(ADA))
    const [row] = await rowsOf(t)

    await t.withIdentity(ADA).mutation(api.planBlocks.remove, { planBlockId: row._id })

    expect(await rowsOf(t)).toEqual([])
  })

  it('refuses to delete another member plan', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await seedUser(t, BOB, 'Bob')
    await t.withIdentity(ADA).mutation(api.planBlocks.create, plan(ADA))
    const [row] = await rowsOf(t)

    await expect(
      t.withIdentity(BOB).mutation(api.planBlocks.remove, { planBlockId: row._id })
    ).rejects.toThrow(/Plan block not found/)
    expect(await rowsOf(t)).toHaveLength(1)
  })
})

describe('planBlocks.listMine', () => {
  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterAll(() => {
    vi.useRealTimers()
  })

  it('returns nothing when unauthenticated', async () => {
    const t = makeTest()
    expect(await t.query(api.planBlocks.listMine, { dayStart: DAY })).toEqual([])
  })

  it('returns only the caller plans for the selected Day', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await seedUser(t, BOB, 'Bob')
    await t.withIdentity(ADA).mutation(api.planBlocks.create, plan(ADA))
    await t
      .withIdentity(ADA)
      .mutation(api.planBlocks.create, plan(ADA, { start: END, end: END + H }))
    await t.withIdentity(BOB).mutation(api.planBlocks.create, plan(BOB))

    const mine = await t.withIdentity(ADA).query(api.planBlocks.listMine, { dayStart: DAY })
    expect(mine.map((entry) => entry.plannedStart)).toEqual([START, END])
  })
})
