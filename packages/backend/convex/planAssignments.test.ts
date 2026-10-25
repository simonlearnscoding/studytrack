/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'
import { DASHBOARD_TIME_ZONE, startOfDay } from './workSessions/util'

const modules = import.meta.glob('./**/*.ts')

const H = 60 * 60 * 1000
// Local noon on 2026-06-15: the 16:00 block is upcoming, the 12:00 one ended.
const NOW = Date.UTC(2026, 5, 15, 10, 0, 0)
const DAY = startOfDay(NOW, DASHBOARD_TIME_ZONE)
const UPCOMING_START = DAY + 16 * H
const UPCOMING_END = DAY + 17 * H
const LATER_START = DAY + 18 * H
const LATER_END = DAY + 19 * H
const LIVE_START = DAY + 14 * H
const LIVE_END = DAY + 15 * H
const ENDED_START = DAY + 10 * H
const ENDED_END = DAY + 11 * H

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

async function seedTask(
  t: Test,
  userId: Id<'users'>,
  overrides: Partial<{ title: string; done: boolean; plannedAt: number }> = {}
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('task', {
      userId,
      title: overrides.title ?? 'Read',
      done: overrides.done ?? false,
      plannedAt: overrides.plannedAt ?? DAY,
    })
  })
}

async function seedPlan(
  t: Test,
  userId: Id<'users'>,
  overrides: Partial<{ plannedStart: number; plannedEnd: number; title: string }> = {}
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('planBlock', {
      userId,
      dayStart: DAY,
      title: overrides.title ?? 'Deep work',
      plannedStart: overrides.plannedStart ?? UPCOMING_START,
      plannedEnd: overrides.plannedEnd ?? UPCOMING_END,
    })
  })
}

async function seedAssignment(
  t: Test,
  userId: Id<'users'>,
  taskId: Id<'task'>,
  planBlockId: Id<'planBlock'>
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('planAssignment', { userId, taskId, planBlockId, dayStart: DAY })
  })
}

async function assignmentsOf(t: Test) {
  return await t.run(async (ctx) => await ctx.db.query('planAssignment').collect())
}

describe('planBlocks.assign', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejects an unauthenticated caller', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId)
    const planBlockId = await seedPlan(t, userId)

    await expect(t.mutation(api.planBlocks.assign, { planBlockId, taskId })).rejects.toThrow(
      /Not authenticated/
    )
  })

  it('attaches an open task and lists it on the block', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId, { title: 'Read a chapter' })
    const planBlockId = await seedPlan(t, userId)

    await t.withIdentity(ADA).mutation(api.planBlocks.assign, { planBlockId, taskId })

    const detail = await t.withIdentity(ADA).query(api.planBlocks.getWithTasks, { planBlockId })
    expect(detail?.isOwner).toBe(true)
    expect(detail?.tasks).toEqual([
      { id: taskId, title: 'Read a chapter', done: false, completedAt: null },
    ])
  })

  it('moves the task out of another unended block', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId)
    const first = await seedPlan(t, userId)
    const second = await seedPlan(t, userId, {
      plannedStart: LATER_START,
      plannedEnd: LATER_END,
    })

    await t.withIdentity(ADA).mutation(api.planBlocks.assign, { planBlockId: first, taskId })
    await t.withIdentity(ADA).mutation(api.planBlocks.assign, { planBlockId: second, taskId })

    const [firstDetail, secondDetail] = await Promise.all([
      t.withIdentity(ADA).query(api.planBlocks.getWithTasks, { planBlockId: first }),
      t.withIdentity(ADA).query(api.planBlocks.getWithTasks, { planBlockId: second }),
    ])
    expect(firstDetail?.tasks).toEqual([])
    expect(secondDetail?.tasks.map((task) => task.id)).toEqual([taskId])
    expect(await assignmentsOf(t)).toHaveLength(1)
  })

  it('keeps an ended block as the record when the task is planned again', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId)
    const ended = await seedPlan(t, userId, {
      plannedStart: ENDED_START,
      plannedEnd: ENDED_END,
    })
    const upcoming = await seedPlan(t, userId)
    await seedAssignment(t, userId, taskId, ended)

    await t.withIdentity(ADA).mutation(api.planBlocks.assign, {
      planBlockId: upcoming,
      taskId,
    })

    expect(await assignmentsOf(t)).toHaveLength(2)
    const endedDetail = await t.withIdentity(ADA).query(api.planBlocks.getWithTasks, {
      planBlockId: ended,
    })
    expect(endedDetail?.tasks.map((task) => task.id)).toEqual([taskId])
  })

  it('refuses a block that has ended', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId)
    const ended = await seedPlan(t, userId, {
      plannedStart: ENDED_START,
      plannedEnd: ENDED_END,
    })

    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.assign, { planBlockId: ended, taskId })
    ).rejects.toThrow(/ended/)
  })

  it('refuses a Done task', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId, { done: true })
    const planBlockId = await seedPlan(t, userId)

    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.assign, { planBlockId, taskId })
    ).rejects.toThrow(/open/)
  })

  it('refuses a task planned for another Day', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId, { plannedAt: DAY - 24 * H })
    const planBlockId = await seedPlan(t, userId)

    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.assign, { planBlockId, taskId })
    ).rejects.toThrow(/its Day/)
  })

  it("never leaks another member's block or task", async () => {
    const t = makeTest()
    const adaId = await seedUser(t, ADA, 'Ada')
    const bobId = await seedUser(t, BOB, 'Bob')
    const bobTask = await seedTask(t, bobId)
    const myTask = await seedTask(t, adaId)
    const bobPlan = await seedPlan(t, bobId)
    const myPlan = await seedPlan(t, adaId)

    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.assign, {
        planBlockId: bobPlan,
        taskId: myTask,
      })
    ).rejects.toThrow(/Plan block not found/)
    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.assign, {
        planBlockId: myPlan,
        taskId: bobTask,
      })
    ).rejects.toThrow(/Task not found/)
  })

  it('is idempotent when the task is already in the block', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId)
    const planBlockId = await seedPlan(t, userId)

    await t.withIdentity(ADA).mutation(api.planBlocks.assign, { planBlockId, taskId })
    await t.withIdentity(ADA).mutation(api.planBlocks.assign, { planBlockId, taskId })

    expect(await assignmentsOf(t)).toHaveLength(1)
  })

  it('moves a task out of a live block into an upcoming one', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId)
    const live = await seedPlan(t, userId, {
      plannedStart: LIVE_START,
      plannedEnd: LIVE_END,
    })
    const upcoming = await seedPlan(t, userId)
    await seedAssignment(t, userId, taskId, live)
    vi.setSystemTime(LIVE_START + 30 * 60 * 1000)

    await t.withIdentity(ADA).mutation(api.planBlocks.assign, {
      planBlockId: upcoming,
      taskId,
    })

    expect(await assignmentsOf(t)).toHaveLength(1)
    const detail = await t.withIdentity(ADA).query(api.planBlocks.getWithTasks, {
      planBlockId: live,
    })
    expect(detail?.tasks).toEqual([])
  })

  it('allows a live block to receive a task', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId)
    const planBlockId = await seedPlan(t, userId, {
      plannedStart: LIVE_START,
      plannedEnd: LIVE_END,
    })
    vi.setSystemTime(LIVE_START + 30 * 60 * 1000)

    await t.withIdentity(ADA).mutation(api.planBlocks.assign, { planBlockId, taskId })

    const detail = await t.withIdentity(ADA).query(api.planBlocks.getWithTasks, { planBlockId })
    expect(detail?.tasks.map((task) => task.id)).toEqual([taskId])
  })
})

describe('planBlocks.unassign', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('detaches the task from an unended block', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId)
    const planBlockId = await seedPlan(t, userId)
    await seedAssignment(t, userId, taskId, planBlockId)

    await t.withIdentity(ADA).mutation(api.planBlocks.unassign, { planBlockId, taskId })

    expect(await assignmentsOf(t)).toEqual([])
  })

  it('refuses to rewrite a past block', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId)
    const ended = await seedPlan(t, userId, {
      plannedStart: ENDED_START,
      plannedEnd: ENDED_END,
    })
    await seedAssignment(t, userId, taskId, ended)

    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.unassign, { planBlockId: ended, taskId })
    ).rejects.toThrow(/ended/)

    expect(await assignmentsOf(t)).toHaveLength(1)
  })
})

describe('planBlocks.getWithTasks', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is public but marks a foreign block read-only', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    const bobId = await seedUser(t, BOB, 'Bob')
    const bobTask = await seedTask(t, bobId, { title: 'Bob task' })
    const bobPlan = await seedPlan(t, bobId)
    await seedAssignment(t, bobId, bobTask, bobPlan)

    const detail = await t.withIdentity(ADA).query(api.planBlocks.getWithTasks, {
      planBlockId: bobPlan,
    })
    expect(detail?.isOwner).toBe(false)
    expect(detail?.tasks.map((task) => task.title)).toEqual(['Bob task'])
  })

  it('lists the Day queue order: Open before Done, then manual position', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const planBlockId = await seedPlan(t, userId)
    const done = await seedTask(t, userId, { title: 'Done one', done: true })
    const openLater = await seedTask(t, userId, { title: 'Open later' })
    const openFirst = await seedTask(t, userId, { title: 'Open first' })
    await t.run(async (ctx) => {
      await ctx.db.patch(openLater, { position: 1 })
      await ctx.db.patch(openFirst, { position: 0 })
    })
    for (const taskId of [done, openLater, openFirst]) {
      await seedAssignment(t, userId, taskId, planBlockId)
    }

    const detail = await t.withIdentity(ADA).query(api.planBlocks.getWithTasks, {
      planBlockId,
    })
    expect(detail?.tasks.map((task) => task.title)).toEqual([
      'Open first',
      'Open later',
      'Done one',
    ])
  })

  it('returns null for a deleted block and for a signed-out caller', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const planBlockId = await seedPlan(t, userId)
    await t.run(async (ctx) => await ctx.db.delete(planBlockId))

    expect(await t.withIdentity(ADA).query(api.planBlocks.getWithTasks, { planBlockId })).toBeNull()
    expect(await t.query(api.planBlocks.getWithTasks, { planBlockId })).toBeNull()
  })
})

describe('plan assignment lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('deletes an upcoming block assignments and leaves its tasks on the Day', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId)
    const planBlockId = await seedPlan(t, userId)
    await seedAssignment(t, userId, taskId, planBlockId)

    await t.withIdentity(ADA).mutation(api.planBlocks.remove, { planBlockId })

    expect(await assignmentsOf(t)).toEqual([])
    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(tasks.map((task) => task.id)).toEqual([taskId])
  })

  it('refuses to remove a started block and keeps its assignments', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId)
    const planBlockId = await seedPlan(t, userId, {
      plannedStart: LIVE_START,
      plannedEnd: LIVE_END,
    })
    await seedAssignment(t, userId, taskId, planBlockId)
    vi.setSystemTime(LIVE_START + 30 * 60 * 1000)

    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.remove, { planBlockId })
    ).rejects.toThrow(/started/)
    expect(await assignmentsOf(t)).toHaveLength(1)
  })

  it('keeps an ended assignment when the task moves to another Day', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId)
    const ended = await seedPlan(t, userId, {
      plannedStart: ENDED_START,
      plannedEnd: ENDED_END,
    })
    await seedAssignment(t, userId, taskId, ended)

    await t.withIdentity(ADA).mutation(api.tasks.reschedule, {
      taskId,
      plannedAt: DAY + 24 * H,
    })

    expect(await assignmentsOf(t)).toHaveLength(1)
    const detail = await t.withIdentity(ADA).query(api.planBlocks.getWithTasks, {
      planBlockId: ended,
    })
    expect(detail?.tasks.map((task) => task.id)).toEqual([taskId])
  })

  it('drops a deleted task assignments', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId)
    const planBlockId = await seedPlan(t, userId)
    await seedAssignment(t, userId, taskId, planBlockId)

    await t.withIdentity(ADA).mutation(api.tasks.remove, { taskId })

    expect(await assignmentsOf(t)).toEqual([])
  })

  it('puts the newest assignment on the task Day read', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId)
    const past = await seedPlan(t, userId, {
      plannedStart: ENDED_START,
      plannedEnd: ENDED_END,
    })
    const upcoming = await seedPlan(t, userId)
    await seedAssignment(t, userId, taskId, past)
    vi.setSystemTime(NOW + 1)
    await seedAssignment(t, userId, taskId, upcoming)

    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(tasks[0].plan).toMatchObject({
      planBlockId: upcoming,
      title: 'Deep work',
      plannedStart: UPCOMING_START,
      plannedEnd: UPCOMING_END,
    })
  })
})
