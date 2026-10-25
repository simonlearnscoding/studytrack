/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'
import { DASHBOARD_TIME_ZONE, startOfDay } from './workSessions/util'

const modules = import.meta.glob('./**/*.ts')

const ADA = { subject: 'clerk-ada' }
const BOB = { subject: 'clerk-bob' }

// 2026-06-15 00:00 Europe/Zurich. The Day is just an opaque number to the API.
const DAY = Date.UTC(2026, 5, 14, 22, 0, 0)
const YESTERDAY = DAY - 24 * 60 * 60 * 1000
const TOMORROW = DAY + 24 * 60 * 60 * 1000
// The real today. A completion earns an instant only when its Focus day is this.
const TODAY = startOfDay(Date.now(), DASHBOARD_TIME_ZONE)
// A Day that has not started yet, for an assignment whose block has not ended.
const UPCOMING_DAY = startOfDay(Date.now() + 24 * 60 * 60 * 1000, DASHBOARD_TIME_ZONE)

function makeTest() {
  return convexTest(schema, modules)
}

type Test = ReturnType<typeof makeTest>

async function seedUser(t: Test, identity: { subject: string }, name: string) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      clerkUserId: identity.subject,
      name,
      createdAt: Date.now(),
    })
  })
}

async function tasksOf(t: Test) {
  return await t.run(async (ctx) => await ctx.db.query('task').collect())
}

async function create(t: Test, identity: { subject: string }, title: string, plannedAt = DAY) {
  await t.withIdentity(identity).mutation(api.tasks.create, { title, plannedAt })
}

describe('tasks.listMine', () => {
  it('returns nothing when unauthenticated', async () => {
    const t = makeTest()
    expect(await t.query(api.tasks.listMine, { dayStart: DAY })).toEqual([])
  })

  it('returns exactly the selected Day, oldest first, with new tasks at the bottom', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'First')
    await create(t, ADA, 'Second')
    await create(t, ADA, 'Yesterday', YESTERDAY)
    await create(t, ADA, 'Tomorrow', TOMORROW)

    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(tasks.map((task) => task.title)).toEqual(['First', 'Second'])
    expect(tasks[0]).toMatchObject({
      done: false,
      completedAt: null,
      plannedAt: DAY,
      plan: null,
    })
  })

  it("returns today's plan when the old dashboard passes today's Day", async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Today plan')

    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(tasks.map((task) => task.title)).toEqual(['Today plan'])
  })

  it('is bounded and keeps the newest tasks when a Day is over the cap', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    await t.run(async (ctx) => {
      for (let i = 0; i < 201; i++) {
        await ctx.db.insert('task', {
          userId,
          title: `Task ${i}`,
          done: false,
          plannedAt: DAY,
        })
      }
    })

    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(tasks).toHaveLength(200)
    expect(tasks[0].title).toBe('Task 1')
    expect(tasks.at(-1)?.title).toBe('Task 200')
    expect(tasks.some((task) => task.title === 'Task 0')).toBe(false)
  })

  it('keeps each member tasks on their own Day list', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await seedUser(t, BOB, 'Bob')
    await create(t, ADA, 'Ada task')
    await create(t, BOB, 'Bob task')

    const ada = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    const bob = await t.withIdentity(BOB).query(api.tasks.listMine, { dayStart: DAY })
    expect(ada.map((task) => task.title)).toEqual(['Ada task'])
    expect(bob.map((task) => task.title)).toEqual(['Bob task'])
  })
})

describe('tasks.getNow', () => {
  it('returns nothing when unauthenticated', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Read a chapter')

    expect(await t.query(api.tasks.getNow, { dayStart: DAY, now: Date.now() })).toBeNull()
  })

  it('returns the first Open task in queue order and advances as tasks are done', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Second')
    await create(t, ADA, 'Top')
    const [second, top] = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    await t.withIdentity(ADA).mutation(api.tasks.reorder, {
      dayStart: DAY,
      orderedTaskIds: [top.id, second.id],
    })

    expect((await t.withIdentity(ADA).query(api.tasks.getNow, { dayStart: DAY, now: Date.now() }))?.title).toBe(
      'Top'
    )

    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: top.id,
      focusDayStart: TODAY,
    })
    expect((await t.withIdentity(ADA).query(api.tasks.getNow, { dayStart: DAY, now: Date.now() }))?.title).toBe(
      'Second'
    )

    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: second.id,
      focusDayStart: TODAY,
    })
    expect(await t.withIdentity(ADA).query(api.tasks.getNow, { dayStart: DAY, now: Date.now() })).toBeNull()
  })

  it('is scoped to the Day it is asked for', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Today', DAY)
    await create(t, ADA, 'Tomorrow', TOMORROW)

    expect((await t.withIdentity(ADA).query(api.tasks.getNow, { dayStart: DAY, now: Date.now() }))?.title).toBe(
      'Today'
    )
    expect((await t.withIdentity(ADA).query(api.tasks.getNow, { dayStart: TOMORROW, now: Date.now() }))?.title).toBe(
      'Tomorrow'
    )
    expect(await t.withIdentity(ADA).query(api.tasks.getNow, { dayStart: YESTERDAY, now: Date.now() })).toBeNull()
  })
})

describe('tasks.reorder', () => {
  async function ids(t: Test, identity: { subject: string }, dayStart = DAY) {
    const tasks = await t.withIdentity(identity).query(api.tasks.listMine, { dayStart })
    return tasks.map((task) => task.id)
  }

  it('rejects an unauthenticated caller', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'One')
    const [id] = await ids(t, ADA)

    await expect(
      t.mutation(api.tasks.reorder, { dayStart: DAY, orderedTaskIds: [id] })
    ).rejects.toThrow(/Not authenticated/)
  })

  it('saves the new order for the Day', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'One')
    await create(t, ADA, 'Two')
    await create(t, ADA, 'Three')
    const [one, two, three] = await ids(t, ADA)

    await t.withIdentity(ADA).mutation(api.tasks.reorder, {
      dayStart: DAY,
      orderedTaskIds: [three, one, two],
    })

    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(tasks.map((task) => task.title)).toEqual(['Three', 'One', 'Two'])
  })

  it('leaves the active task, Done state and completion instant alone', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Active')
    await create(t, ADA, 'Done')
    const [active, done] = await ids(t, ADA)
    await t.withIdentity(ADA).mutation(api.tasks.setActive, { taskId: active })
    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: done,
      focusDayStart: TODAY,
    })
    const completedBefore = (await tasksOf(t)).find((task) => task._id === done)?.completedAt

    await t.withIdentity(ADA).mutation(api.tasks.reorder, {
      dayStart: DAY,
      orderedTaskIds: [done, active],
    })

    const result = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    // Done tasks always sink below Open ones, even when a drag asked otherwise.
    expect(result.map((task) => task.title)).toEqual(['Active', 'Done'])
    const doneRow = result.find((task) => task.title === 'Done')
    expect(doneRow?.done).toBe(true)
    expect(doneRow?.completedAt).toBe(completedBefore)
    expect((await t.withIdentity(ADA).query(api.tasks.getActive, {}))?.task.id).toBe(active)
  })

  it('keeps a task added on another device after the given order', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'One')
    await create(t, ADA, 'Two')
    const [one, two] = await ids(t, ADA)
    await create(t, ADA, 'Late')

    await t.withIdentity(ADA).mutation(api.tasks.reorder, {
      dayStart: DAY,
      orderedTaskIds: [two, one],
    })

    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(tasks.map((task) => task.title)).toEqual(['Two', 'One', 'Late'])
  })

  it('rejects a task from another Day and writes nothing', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Today')
    await create(t, ADA, 'Tomorrow', TOMORROW)
    const [today] = await ids(t, ADA)
    const [tomorrow] = await ids(t, ADA, TOMORROW)

    await expect(
      t.withIdentity(ADA).mutation(api.tasks.reorder, {
        dayStart: DAY,
        orderedTaskIds: [tomorrow, today],
      })
    ).rejects.toThrow(/Task not found/)

    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(tasks.map((task) => task.title)).toEqual(['Today'])
  })

  it('rejects another member task', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await seedUser(t, BOB, 'Bob')
    await create(t, ADA, 'Ada task')
    const [adaTask] = await ids(t, ADA)

    await expect(
      t.withIdentity(BOB).mutation(api.tasks.reorder, {
        dayStart: DAY,
        orderedTaskIds: [adaTask],
      })
    ).rejects.toThrow(/Task not found/)
  })

  it('rejects an order that repeats a task', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'One')
    await create(t, ADA, 'Two')
    const [one, two] = await ids(t, ADA)

    await expect(
      t.withIdentity(ADA).mutation(api.tasks.reorder, {
        dayStart: DAY,
        orderedTaskIds: [one, two, one],
      })
    ).rejects.toThrow(/twice/)
  })
})

describe('tasks.reschedule', () => {
  async function idOf(t: Test, title: string) {
    const task = (await tasksOf(t)).find((row) => row.title === title)
    if (!task) throw new Error(`Missing task: ${title}`)
    return task._id
  }

  it('rejects an unauthenticated caller', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Move me')
    const taskId = await idOf(t, 'Move me')

    await expect(t.mutation(api.tasks.reschedule, { taskId, plannedAt: TOMORROW })).rejects.toThrow(
      /Not authenticated/
    )
  })

  it('moves the task to the end of the target Day', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Old one', YESTERDAY)
    await create(t, ADA, 'Old two', YESTERDAY)
    await create(t, ADA, 'Today one')
    await create(t, ADA, 'Today two')
    const taskId = await idOf(t, 'Old one')

    await t.withIdentity(ADA).mutation(api.tasks.reschedule, { taskId, plannedAt: DAY })

    const today = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    const yesterday = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: YESTERDAY })
    expect(today.map((task) => task.title)).toEqual(['Today one', 'Today two', 'Old one'])
    expect(yesterday.map((task) => task.title)).toEqual(['Old two'])
  })

  it('appends after legacy tasks that have no position', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Movable', YESTERDAY)
    const taskId = await idOf(t, 'Movable')
    await t.run(async (ctx) => {
      await ctx.db.insert('task', { userId, title: 'Legacy one', done: false, plannedAt: DAY })
      await ctx.db.insert('task', { userId, title: 'Legacy two', done: false, plannedAt: DAY })
    })

    await t.withIdentity(ADA).mutation(api.tasks.reschedule, { taskId, plannedAt: DAY })

    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(tasks.map((task) => task.title)).toEqual(['Legacy one', 'Legacy two', 'Movable'])
  })

  it('drops an unended plan assignment when the task moves to another Day', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Planned', UPCOMING_DAY)
    const taskId = await idOf(t, 'Planned')
    await t.run(async (ctx) => {
      const task = await ctx.db.get(taskId)
      if (!task) throw new Error('Missing task')
      const planBlockId = await ctx.db.insert('planBlock', {
        userId: task.userId,
        dayStart: UPCOMING_DAY,
        title: 'Read',
        plannedStart: UPCOMING_DAY + 14 * 60 * 60 * 1000,
        plannedEnd: UPCOMING_DAY + 15 * 60 * 60 * 1000,
      })
      await ctx.db.insert('planAssignment', {
        userId: task.userId,
        taskId,
        planBlockId,
        dayStart: UPCOMING_DAY,
      })
    })

    await t.withIdentity(ADA).mutation(api.tasks.reschedule, { taskId, plannedAt: DAY })

    const assignments = await t.run(async (ctx) => await ctx.db.query('planAssignment').collect())
    expect(assignments).toEqual([])
  })

  it('is a no-op when the task is already on that Day', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Stays')
    const taskId = await idOf(t, 'Stays')

    await t.withIdentity(ADA).mutation(api.tasks.reschedule, { taskId, plannedAt: DAY })

    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(tasks.map((task) => task.title)).toEqual(['Stays'])
  })

  it('rejects a plannedAt that is not a Europe/Zurich Day start', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Later')
    const taskId = await idOf(t, 'Later')

    await expect(
      t.withIdentity(ADA).mutation(api.tasks.reschedule, { taskId, plannedAt: DAY + 1000 })
    ).rejects.toThrow(/Day, not a time/)
  })

  it("rejects another member's task", async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await seedUser(t, BOB, 'Bob')
    await create(t, ADA, 'Ada task')
    const taskId = await idOf(t, 'Ada task')

    await expect(
      t.withIdentity(BOB).mutation(api.tasks.reschedule, { taskId, plannedAt: TOMORROW })
    ).rejects.toThrow(/Task not found/)
  })
})

describe('tasks.create', () => {
  it('rejects an unauthenticated caller', async () => {
    const t = makeTest()
    await expect(t.mutation(api.tasks.create, { title: 'Nope', plannedAt: DAY })).rejects.toThrow(
      /Not authenticated/
    )
  })

  it('rejects an empty title', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await expect(
      t.withIdentity(ADA).mutation(api.tasks.create, { title: '   ', plannedAt: DAY })
    ).rejects.toThrow(/needs a title/)
  })

  it('rejects a plannedAt that is not a Europe/Zurich Day start', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await expect(
      t.withIdentity(ADA).mutation(api.tasks.create, { title: 'Later', plannedAt: DAY + 1000 })
    ).rejects.toThrow(/planned for a Day/)
  })

  it('appends a new task after the manual order', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'One')
    await create(t, ADA, 'Two')
    await create(t, ADA, 'Three')
    const before = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    const [one, two, three] = before.map((task) => task.id)

    await t.withIdentity(ADA).mutation(api.tasks.reorder, {
      dayStart: DAY,
      orderedTaskIds: [three, one, two],
    })
    await create(t, ADA, 'Four')

    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(tasks.map((task) => task.title)).toEqual(['Three', 'One', 'Two', 'Four'])
  })

  it('puts a now placement on top so it becomes Now', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'One')
    await create(t, ADA, 'Two')

    await t.withIdentity(ADA).mutation(api.tasks.create, {
      title: 'Right now',
      plannedAt: DAY,
      placement: 'now',
    })

    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(tasks.map((task) => task.title)).toEqual(['Right now', 'One', 'Two'])
  })

  it('puts a next placement right after the current Now', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Done already')
    await create(t, ADA, 'Current now')
    await create(t, ADA, 'Later')
    const before = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: before[0].id,
      focusDayStart: TODAY,
    })

    await t.withIdentity(ADA).mutation(api.tasks.create, {
      title: 'Next up',
      plannedAt: DAY,
      placement: 'next',
    })

    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(tasks.map((task) => task.title)).toEqual([
      'Current now',
      'Next up',
      'Later',
      'Done already',
    ])
  })

  it('positions legacy tasks when inserting above them', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    await t.run(async (ctx) => {
      await ctx.db.insert('task', { userId, title: 'Legacy one', done: false, plannedAt: DAY })
      await ctx.db.insert('task', { userId, title: 'Legacy two', done: false, plannedAt: DAY })
    })

    await t.withIdentity(ADA).mutation(api.tasks.create, {
      title: 'Top',
      plannedAt: DAY,
      placement: 'now',
    })

    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(tasks.map((task) => task.title)).toEqual(['Top', 'Legacy one', 'Legacy two'])
    expect((await tasksOf(t)).every((task) => task.position !== undefined)).toBe(true)
  })

  it('trims the title and stamps the given plannedAt', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, '  Read a chapter  ', TOMORROW)

    const [task] = await tasksOf(t)
    expect(task.title).toBe('Read a chapter')
    expect(task.plannedAt).toBe(TOMORROW)
    expect(task.done).toBe(false)
  })
})

describe('tasks.toggle', () => {
  it('marks done with a completion instant, then reopens it', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Read a chapter')
    const [task] = await tasksOf(t)

    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: task._id,
      focusDayStart: TODAY,
    })
    let [after] = await tasksOf(t)
    expect(after.done).toBe(true)
    expect(after.completedAt).toBeTypeOf('number')

    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: task._id,
      focusDayStart: TODAY,
    })
    ;[after] = await tasksOf(t)
    expect(after.done).toBe(false)
    expect(after.completedAt).toBeUndefined()
  })

  it('leaves the instant absent when the box is ticked while viewing another Day', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Yesterday work', YESTERDAY)
    const [task] = await tasksOf(t)

    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: task._id,
      focusDayStart: YESTERDAY,
    })

    const [after] = await tasksOf(t)
    expect(after.done).toBe(true)
    expect(after.completedAt).toBeUndefined()

    const [listed] = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: YESTERDAY })
    expect(listed).toMatchObject({ done: true, completedAt: null })
  })

  it('records no instant for a future Day either', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Tomorrow work', TOMORROW)
    const [task] = await tasksOf(t)

    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: task._id,
      focusDayStart: TOMORROW,
    })

    const [after] = await tasksOf(t)
    expect(after.done).toBe(true)
    expect(after.completedAt).toBeUndefined()
  })

  it('keys the instant on the viewed Day, not the Day the task was planned for', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Old plan, finished live', YESTERDAY)
    const [task] = await tasksOf(t)

    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: task._id,
      focusDayStart: TODAY,
    })

    const [after] = await tasksOf(t)
    expect(after.completedAt).toBeTypeOf('number')
  })

  it('rejects a Focus day that is not a Day start', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Read a chapter')
    const [task] = await tasksOf(t)

    await expect(
      t.withIdentity(ADA).mutation(api.tasks.toggle, {
        taskId: task._id,
        focusDayStart: TODAY + 1,
      })
    ).rejects.toThrow(/Day start/)

    const [after] = await tasksOf(t)
    expect(after.done).toBe(false)
  })

  it('moves a checked task below the Open ones', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'First')
    await create(t, ADA, 'Second')
    const [first] = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })

    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: first.id,
      focusDayStart: TODAY,
    })

    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    expect(tasks.map((task) => task.title)).toEqual(['Second', 'First'])
  })

  it('refuses to touch another member task', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await seedUser(t, BOB, 'Bob')
    await create(t, ADA, 'Ada private')
    const [adaTask] = await tasksOf(t)

    await expect(
      t.withIdentity(BOB).mutation(api.tasks.toggle, {
        taskId: adaTask._id,
        focusDayStart: TODAY,
      })
    ).rejects.toThrow(/Task not found/)

    const bobTasks = await t.withIdentity(BOB).query(api.tasks.listMine, { dayStart: DAY })
    expect(bobTasks).toEqual([])
  })

  it('clears the active pointer only when completing the active task', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Active')
    await create(t, ADA, 'Side work')
    const [active, side] = await tasksOf(t)
    await t.withIdentity(ADA).mutation(api.tasks.setActive, { taskId: active._id })

    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: side._id,
      focusDayStart: TODAY,
    })
    expect((await t.withIdentity(ADA).query(api.tasks.getActive, {}))?.task.id).toBe(active._id)

    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: active._id,
      focusDayStart: TODAY,
    })
    expect(await t.withIdentity(ADA).query(api.tasks.getActive, {})).toBeNull()
  })

  it('does not reactivate a task when it is reopened', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Active')
    const [task] = await tasksOf(t)

    await t.withIdentity(ADA).mutation(api.tasks.setActive, { taskId: task._id })
    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: task._id,
      focusDayStart: TODAY,
    })
    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: task._id,
      focusDayStart: TODAY,
    })

    expect(await t.withIdentity(ADA).query(api.tasks.getActive, {})).toBeNull()
  })
})

describe('tasks.rename', () => {
  it('rejects an unauthenticated caller', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Read a chapter')
    const [task] = await tasksOf(t)

    await expect(
      t.mutation(api.tasks.rename, { taskId: task._id, title: 'Read two' })
    ).rejects.toThrow(/Not authenticated/)
  })

  it('renames an Open task, trimming the title', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Read a chapter')
    const [task] = await tasksOf(t)

    await t.withIdentity(ADA).mutation(api.tasks.rename, {
      taskId: task._id,
      title: '  Read two chapters  ',
    })

    const [after] = await tasksOf(t)
    expect(after.title).toBe('Read two chapters')
    expect(after.done).toBe(false)
  })

  it('renames a Done task', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Read a chapter')
    const [task] = await tasksOf(t)
    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: task._id,
      focusDayStart: TODAY,
    })

    await t.withIdentity(ADA).mutation(api.tasks.rename, {
      taskId: task._id,
      title: 'Read the whole book',
    })

    const [after] = await tasksOf(t)
    expect(after.title).toBe('Read the whole book')
    expect(after.done).toBe(true)
  })

  it('rejects an empty or whitespace-only title', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Read a chapter')
    const [task] = await tasksOf(t)

    await expect(
      t.withIdentity(ADA).mutation(api.tasks.rename, { taskId: task._id, title: '   ' })
    ).rejects.toThrow(/needs a title/)

    const [after] = await tasksOf(t)
    expect(after.title).toBe('Read a chapter')
  })

  it('refuses to rename another member task', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await seedUser(t, BOB, 'Bob')
    await create(t, ADA, 'Ada private')
    const [adaTask] = await tasksOf(t)

    await expect(
      t.withIdentity(BOB).mutation(api.tasks.rename, { taskId: adaTask._id, title: 'Hijacked' })
    ).rejects.toThrow(/Task not found/)

    const [after] = await tasksOf(t)
    expect(after.title).toBe('Ada private')
  })
})

describe('tasks.remove', () => {
  it('rejects an unauthenticated caller', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Read a chapter')
    const [task] = await tasksOf(t)

    await expect(t.mutation(api.tasks.remove, { taskId: task._id })).rejects.toThrow(
      /Not authenticated/
    )
  })

  it('deletes an Open task', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Read a chapter')
    const [task] = await tasksOf(t)

    await t.withIdentity(ADA).mutation(api.tasks.remove, { taskId: task._id })

    expect(await tasksOf(t)).toEqual([])
  })

  it('deletes a Done task', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Read a chapter')
    const [task] = await tasksOf(t)
    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: task._id,
      focusDayStart: TODAY,
    })

    await t.withIdentity(ADA).mutation(api.tasks.remove, { taskId: task._id })

    expect(await tasksOf(t)).toEqual([])
  })

  it('clears the active pointer when the active task is deleted', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Active')
    const [task] = await tasksOf(t)
    await t.withIdentity(ADA).mutation(api.tasks.setActive, { taskId: task._id })

    await t.withIdentity(ADA).mutation(api.tasks.remove, { taskId: task._id })

    expect(await t.withIdentity(ADA).query(api.tasks.getActive, {})).toBeNull()
  })

  it('refuses to delete another member task', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await seedUser(t, BOB, 'Bob')
    await create(t, ADA, 'Ada private')
    const [adaTask] = await tasksOf(t)

    await expect(
      t.withIdentity(BOB).mutation(api.tasks.remove, { taskId: adaTask._id })
    ).rejects.toThrow(/Task not found/)

    expect(await tasksOf(t)).toHaveLength(1)
  })
})

describe('tasks active pointer', () => {
  it('returns null when unauthenticated', async () => {
    const t = makeTest()
    expect(await t.query(api.tasks.getActive, {})).toBeNull()
  })

  it('persists the active task and its activeSince', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Read a chapter')
    const [task] = await tasksOf(t)

    await t.withIdentity(ADA).mutation(api.tasks.setActive, { taskId: task._id })

    const active = await t.withIdentity(ADA).query(api.tasks.getActive, {})
    expect(active?.task).toMatchObject({ id: task._id, title: 'Read a chapter', done: false })
    expect(active?.activeSince).toBeTypeOf('number')
  })

  it('keeps activeSince when the same task is set again', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Read a chapter')
    const [task] = await tasksOf(t)

    await t.withIdentity(ADA).mutation(api.tasks.setActive, { taskId: task._id })
    const first = await t.withIdentity(ADA).query(api.tasks.getActive, {})
    await t.withIdentity(ADA).mutation(api.tasks.setActive, { taskId: task._id })
    const second = await t.withIdentity(ADA).query(api.tasks.getActive, {})

    expect(second?.activeSince).toBe(first?.activeSince)
  })

  it('rejects a Done task', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Done')
    const [task] = await tasksOf(t)
    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: task._id,
      focusDayStart: TODAY,
    })

    await expect(
      t.withIdentity(ADA).mutation(api.tasks.setActive, { taskId: task._id })
    ).rejects.toThrow(/open task/)
  })

  it('rejects another member task', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await seedUser(t, BOB, 'Bob')
    await create(t, ADA, 'Ada task')
    const [task] = await tasksOf(t)

    await expect(
      t.withIdentity(BOB).mutation(api.tasks.setActive, { taskId: task._id })
    ).rejects.toThrow(/Task not found/)
  })

  it('rejects an unauthenticated caller', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Read a chapter')
    const [task] = await tasksOf(t)

    await expect(t.mutation(api.tasks.setActive, { taskId: task._id })).rejects.toThrow(
      /Not authenticated/
    )
  })

  it('is left alone by creating a task', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Active')
    const [task] = await tasksOf(t)
    await t.withIdentity(ADA).mutation(api.tasks.setActive, { taskId: task._id })

    await create(t, ADA, 'Newer plan')

    expect((await t.withIdentity(ADA).query(api.tasks.getActive, {}))?.task.id).toBe(task._id)
  })

  it('rejects an unauthenticated clear', async () => {
    const t = makeTest()
    await expect(t.mutation(api.tasks.clearActive, {})).rejects.toThrow(/Not authenticated/)
  })

  it('clears explicitly and is idempotent', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Active')
    const [task] = await tasksOf(t)
    await t.withIdentity(ADA).mutation(api.tasks.setActive, { taskId: task._id })

    await t.withIdentity(ADA).mutation(api.tasks.clearActive, {})
    await t.withIdentity(ADA).mutation(api.tasks.clearActive, {})

    expect(await t.withIdentity(ADA).query(api.tasks.getActive, {})).toBeNull()
  })

  it('returns null when the pointed task no longer exists', async () => {
    const t = makeTest()
    const userId = await seedUser(t, ADA, 'Ada')
    await t.run(async (ctx) => {
      const taskId = await ctx.db.insert('task', {
        userId,
        title: 'Soon gone',
        done: false,
        plannedAt: DAY,
      })
      await ctx.db.patch(userId, { activeTaskId: taskId, activeSince: Date.now() })
      // Simulate a stale pointer left behind by a hard delete.
      await ctx.db.delete(taskId)
    })

    expect(await t.withIdentity(ADA).query(api.tasks.getActive, {})).toBeNull()
  })
})

describe('tasks.search', () => {
  it('returns nothing when unauthenticated or the query is blank', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Read a chapter')

    expect(await t.query(api.tasks.search, { query: 'read' })).toEqual([])
    expect(await t.withIdentity(ADA).query(api.tasks.search, { query: '   ' })).toEqual([])
  })

  it("finds the caller's Open Tasks across Days and hides Done ones", async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Read a chapter')
    await create(t, ADA, 'Read tomorrow', TOMORROW)
    await create(t, ADA, 'Read yesterday', YESTERDAY)
    await create(t, ADA, 'Write notes')
    const [done] = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: DAY })
    await t.withIdentity(ADA).mutation(api.tasks.toggle, {
      taskId: done.id,
      focusDayStart: DAY,
    })

    const results = await t.withIdentity(ADA).query(api.tasks.search, { query: 'read' })
    expect(results.map((task) => task.title).sort()).toEqual(['Read tomorrow', 'Read yesterday'])
  })

  it("never returns another member's tasks", async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await seedUser(t, BOB, 'Bob')
    await create(t, BOB, 'Bob reading')

    expect(await t.withIdentity(ADA).query(api.tasks.search, { query: 'bob' })).toEqual([])
    const bob = await t.withIdentity(BOB).query(api.tasks.search, { query: 'bob' })
    expect(bob.map((task) => task.title)).toEqual(['Bob reading'])
  })

  it('is bounded by the requested limit and the service cap', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    for (let i = 0; i < 12; i++) await create(t, ADA, `Book ${i}`)

    const small = await t.withIdentity(ADA).query(api.tasks.search, { query: 'book', limit: 3 })
    expect(small).toHaveLength(3)
    const capped = await t.withIdentity(ADA).query(api.tasks.search, {
      query: 'book',
      limit: 500,
    })
    expect(capped).toHaveLength(12)
  })
})
