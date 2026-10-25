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

  it('moves a task planned for another Day onto the block Day', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const previousDay = DAY - 24 * H
    const taskId = await seedTask(t, userId, { plannedAt: previousDay })
    const planBlockId = await seedPlan(t, userId)

    await t.withIdentity(ADA).mutation(api.planBlocks.assign, { planBlockId, taskId })

    const blockDay = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(blockDay.map((task) => task.id)).toEqual([taskId])
    const oldDay = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: previousDay })
    expect(oldDay).toEqual([])
  })

  it('drops an unended plan on the old Day when the task moves', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const nextDay = DAY + 24 * H
    const taskId = await seedTask(t, userId, { plannedAt: nextDay })
    const oldPlan = await t.run(async (ctx) => {
      const planBlockId = await ctx.db.insert('planBlock', {
        userId,
        dayStart: nextDay,
        title: 'Old plan',
        plannedStart: nextDay + 10 * H,
        plannedEnd: nextDay + 11 * H,
      })
      await ctx.db.insert('planAssignment', {
        userId,
        taskId,
        planBlockId,
        dayStart: nextDay,
      })
      return planBlockId
    })
    const planBlockId = await seedPlan(t, userId)

    await t.withIdentity(ADA).mutation(api.planBlocks.assign, { planBlockId, taskId })

    const oldDetail = await t.withIdentity(ADA).query(api.planBlocks.getWithTasks, {
      planBlockId: oldPlan,
    })
    expect(oldDetail?.tasks).toEqual([])
    expect(await assignmentsOf(t)).toHaveLength(1)
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

  it('assigns and reorders in one write', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const first = await seedTask(t, userId, { title: 'First' })
    const second = await seedTask(t, userId, { title: 'Second' })
    const third = await seedTask(t, userId, { title: 'Third' })
    await t.run(async (ctx) => {
      await ctx.db.patch(first, { position: 0 })
      await ctx.db.patch(second, { position: 1 })
      await ctx.db.patch(third, { position: 2 })
    })
    const planBlockId = await seedPlan(t, userId)

    await t.withIdentity(ADA).mutation(api.planBlocks.assign, {
      planBlockId,
      taskId: third,
      orderedTaskIds: [third, first, second],
    })

    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(tasks.map((task) => task.title)).toEqual(['Third', 'First', 'Second'])
    expect(tasks[0].plan?.planBlockId).toBe(planBlockId)
  })

  it('rolls the assignment back when the supplied order is invalid', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId)
    const otherDayTask = await seedTask(t, userId, { plannedAt: DAY + 24 * H })
    const planBlockId = await seedPlan(t, userId)

    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.assign, {
        planBlockId,
        taskId,
        orderedTaskIds: [taskId, otherDayTask],
      })
    ).rejects.toThrow(/Task not found/)

    expect(await assignmentsOf(t)).toEqual([])
  })
})

describe('planBlocks.create with tasks', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('writes the block, a new task and every assignment together', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const first = await seedTask(t, userId, { title: 'Read a chapter' })
    const second = await seedTask(t, userId, { title: 'Solve exercises' })

    await t.withIdentity(ADA).mutation(api.planBlocks.create, {
      dayStart: DAY,
      title: 'Deep work',
      plannedStart: UPCOMING_START,
      plannedEnd: UPCOMING_END,
      taskIds: [first, second],
      newTaskTitles: ['Write notes'],
    })

    const [plan] = await t.run(async (ctx) => await ctx.db.query('planBlock').collect())
    const detail = await t.withIdentity(ADA).query(api.planBlocks.getWithTasks, {
      planBlockId: plan._id,
    })
    expect(detail?.tasks.map((task) => task.title)).toEqual([
      'Read a chapter',
      'Solve exercises',
      'Write notes',
    ])
    expect(await assignmentsOf(t)).toHaveLength(3)
    const day = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(day.map((task) => task.title)).toEqual([
      'Read a chapter',
      'Solve exercises',
      'Write notes',
    ])
  })

  it('moves a picked task from another Day into the block Day', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const previousDay = DAY - 24 * H
    const taskId = await seedTask(t, userId, { plannedAt: previousDay })

    await t.withIdentity(ADA).mutation(api.planBlocks.create, {
      dayStart: DAY,
      title: 'Deep work',
      plannedStart: UPCOMING_START,
      plannedEnd: UPCOMING_END,
      taskIds: [taskId],
    })

    const day = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(day.map((task) => task.id)).toEqual([taskId])
  })

  it('leaves no block, task or assignment when any part is refused', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const done = await seedTask(t, userId, { title: 'Already done', done: true })

    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.create, {
        dayStart: DAY,
        title: 'Deep work',
        plannedStart: UPCOMING_START,
        plannedEnd: UPCOMING_END,
        taskIds: [done],
        newTaskTitles: ['Should never exist'],
      })
    ).rejects.toThrow(/open/)

    expect(await t.run(async (ctx) => await ctx.db.query('planBlock').collect())).toEqual([])
    expect(await assignmentsOf(t)).toEqual([])
    expect(await t.run(async (ctx) => await ctx.db.query('task').collect())).toHaveLength(1)
  })

  it('refuses an unauthenticated create', async () => {
    const t = makeTest()
    await expect(
      t.mutation(api.planBlocks.create, {
        dayStart: DAY,
        title: 'Deep work',
        plannedStart: UPCOMING_START,
        plannedEnd: UPCOMING_END,
      })
    ).rejects.toThrow(/Not authenticated/)
  })
})

describe('planBlocks.assignNew', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates the task on the block Day and assigns it', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const planBlockId = await seedPlan(t, userId)

    await t.withIdentity(ADA).mutation(api.planBlocks.assignNew, {
      planBlockId,
      title: 'Write notes',
    })

    const detail = await t.withIdentity(ADA).query(api.planBlocks.getWithTasks, { planBlockId })
    expect(detail?.tasks.map((task) => task.title)).toEqual(['Write notes'])
    const day = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(day.map((task) => task.title)).toEqual(['Write notes'])
  })

  it('writes neither the task nor the assignment when the block has ended', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const ended = await seedPlan(t, userId, {
      plannedStart: ENDED_START,
      plannedEnd: ENDED_END,
    })

    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.assignNew, {
        planBlockId: ended,
        title: 'Too late',
      })
    ).rejects.toThrow(/ended/)

    expect(await t.run(async (ctx) => await ctx.db.query('task').collect())).toEqual([])
    expect(await assignmentsOf(t)).toEqual([])
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

  it('unassigns and reorders in one write', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const first = await seedTask(t, userId, { title: 'First' })
    const second = await seedTask(t, userId, { title: 'Second' })
    const third = await seedTask(t, userId, { title: 'Third' })
    await t.run(async (ctx) => {
      await ctx.db.patch(first, { position: 0 })
      await ctx.db.patch(second, { position: 1 })
      await ctx.db.patch(third, { position: 2 })
    })
    const planBlockId = await seedPlan(t, userId)
    await seedAssignment(t, userId, third, planBlockId)

    await t.withIdentity(ADA).mutation(api.planBlocks.unassign, {
      planBlockId,
      taskId: third,
      orderedTaskIds: [first, second, third],
    })

    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(tasks.map((task) => task.title)).toEqual(['First', 'Second', 'Third'])
    expect(tasks[2].plan).toBeNull()
  })

  it('rolls the unassignment back when the supplied order is invalid', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const taskId = await seedTask(t, userId)
    const otherDayTask = await seedTask(t, userId, { plannedAt: DAY + 24 * H })
    const planBlockId = await seedPlan(t, userId)
    await seedAssignment(t, userId, taskId, planBlockId)

    await expect(
      t.withIdentity(ADA).mutation(api.planBlocks.unassign, {
        planBlockId,
        taskId,
        orderedTaskIds: [taskId, otherDayTask],
      })
    ).rejects.toThrow(/Task not found/)

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

describe('tasks.getNow with plan groups', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('leads with the live plan, then the unscheduled queue, then the next plan', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const unscheduled = await seedTask(t, userId, { title: 'Unscheduled' })
    const live = await seedTask(t, userId, { title: 'Live' })
    const upcoming = await seedTask(t, userId, { title: 'Upcoming' })
    await t.run(async (ctx) => {
      await ctx.db.patch(unscheduled, { position: 0 })
      await ctx.db.patch(live, { position: 1 })
      await ctx.db.patch(upcoming, { position: 2 })
    })
    const liveBlock = await seedPlan(t, userId, {
      plannedStart: NOW - H,
      plannedEnd: NOW + H,
    })
    const upcomingBlock = await seedPlan(t, userId, {
      plannedStart: UPCOMING_START,
      plannedEnd: UPCOMING_END,
    })
    await seedAssignment(t, userId, live, liveBlock)
    await seedAssignment(t, userId, upcoming, upcomingBlock)

    expect(
      (await t.withIdentity(ADA).query(api.tasks.getNow, { dayStart: DAY, now: NOW }))?.title
    ).toBe('Live')

    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: live,
      focusDayStart: DAY,
    })
    expect(
      (await t.withIdentity(ADA).query(api.tasks.getNow, { dayStart: DAY, now: NOW }))?.title
    ).toBe('Unscheduled')
  })

  it('uses the live plan queue order', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const second = await seedTask(t, userId, { title: 'Second' })
    const first = await seedTask(t, userId, { title: 'First' })
    await t.run(async (ctx) => {
      await ctx.db.patch(second, { position: 1 })
      await ctx.db.patch(first, { position: 0 })
    })
    const liveBlock = await seedPlan(t, userId, {
      plannedStart: NOW - H,
      plannedEnd: NOW + H,
    })
    await seedAssignment(t, userId, second, liveBlock)
    await seedAssignment(t, userId, first, liveBlock)

    expect(
      (await t.withIdentity(ADA).query(api.tasks.getNow, { dayStart: DAY, now: NOW }))?.title
    ).toBe('First')
  })

  it('falls to the earliest upcoming plan when nothing is live or unscheduled', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const later = await seedTask(t, userId, { title: 'Later' })
    const soon = await seedTask(t, userId, { title: 'Soon' })
    const laterBlock = await seedPlan(t, userId, {
      plannedStart: LATER_START,
      plannedEnd: LATER_END,
    })
    const soonBlock = await seedPlan(t, userId, {
      plannedStart: UPCOMING_START,
      plannedEnd: UPCOMING_END,
    })
    await seedAssignment(t, userId, later, laterBlock)
    await seedAssignment(t, userId, soon, soonBlock)

    expect(
      (await t.withIdentity(ADA).query(api.tasks.getNow, { dayStart: DAY, now: NOW }))?.title
    ).toBe('Soon')
  })

  it('treats a task whose plan ended as unscheduled', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    const endedTask = await seedTask(t, userId, { title: 'Ended plan' })
    const endedBlock = await seedPlan(t, userId, {
      plannedStart: ENDED_START,
      plannedEnd: ENDED_END,
    })
    await seedAssignment(t, userId, endedTask, endedBlock)

    expect(
      (await t.withIdentity(ADA).query(api.tasks.getNow, { dayStart: DAY, now: NOW }))?.title
    ).toBe('Ended plan')
  })
})
