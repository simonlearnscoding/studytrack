/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

const ADA = { subject: 'clerk-ada' }
const BOB = { subject: 'clerk-bob' }

// 2026-06-15 00:00 Europe/Zurich. The Day is just an opaque number to the API.
const DAY = Date.UTC(2026, 5, 14, 22, 0, 0)
const YESTERDAY = DAY - 24 * 60 * 60 * 1000
const TOMORROW = DAY + 24 * 60 * 60 * 1000

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
      plannedSessionId: null,
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

    await t.withIdentity(ADA).mutation(api.tasks.toggle, { taskId: task._id })
    let [after] = await tasksOf(t)
    expect(after.done).toBe(true)
    expect(after.completedAt).toBeTypeOf('number')

    await t.withIdentity(ADA).mutation(api.tasks.toggle, { taskId: task._id })
    ;[after] = await tasksOf(t)
    expect(after.done).toBe(false)
    expect(after.completedAt).toBeUndefined()
  })

  it('refuses to touch another member task', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await seedUser(t, BOB, 'Bob')
    await create(t, ADA, 'Ada private')
    const [adaTask] = await tasksOf(t)

    await expect(
      t.withIdentity(BOB).mutation(api.tasks.toggle, { taskId: adaTask._id })
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

    await t.withIdentity(ADA).mutation(api.tasks.toggle, { taskId: side._id })
    expect((await t.withIdentity(ADA).query(api.tasks.getActive, {}))?.task.id).toBe(active._id)

    await t.withIdentity(ADA).mutation(api.tasks.toggle, { taskId: active._id })
    expect(await t.withIdentity(ADA).query(api.tasks.getActive, {})).toBeNull()
  })

  it('does not reactivate a task when it is reopened', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await create(t, ADA, 'Active')
    const [task] = await tasksOf(t)

    await t.withIdentity(ADA).mutation(api.tasks.setActive, { taskId: task._id })
    await t.withIdentity(ADA).mutation(api.tasks.toggle, { taskId: task._id })
    await t.withIdentity(ADA).mutation(api.tasks.toggle, { taskId: task._id })

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
    await t.withIdentity(ADA).mutation(api.tasks.toggle, { taskId: task._id })

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
    await t.withIdentity(ADA).mutation(api.tasks.toggle, { taskId: task._id })

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
    await t.withIdentity(ADA).mutation(api.tasks.toggle, { taskId: task._id })

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
