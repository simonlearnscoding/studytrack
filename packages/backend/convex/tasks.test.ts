/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

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
      createdAt: Date.now(),
    })
  })
}

async function tasksOf(t: Test) {
  return await t.run(async (ctx) => await ctx.db.query('task').collect())
}

describe('tasks.listMine', () => {
  it('returns nothing when unauthenticated', async () => {
    const t = makeTest()
    expect(await t.query(api.tasks.listMine, { dayStart: 0 })).toEqual([])
  })

  it('returns the caller tasks created today, newest first', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await t.withIdentity(ADA).mutation(api.tasks.create, { title: 'First' })
    await t.withIdentity(ADA).mutation(api.tasks.create, { title: 'Second' })

    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, { dayStart: 0 })
    expect(tasks.map((task) => task.title)).toEqual(['Second', 'First'])
    expect(tasks[0]).toMatchObject({ done: false, completedAt: null })
  })

  it('hides tasks created before the day start', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await t.withIdentity(ADA).mutation(api.tasks.create, { title: 'Old' })

    // A day start in the future puts the just-created task before "today".
    const tasks = await t.withIdentity(ADA).query(api.tasks.listMine, {
      dayStart: Date.now() + 60_000,
    })
    expect(tasks).toEqual([])
  })
})

describe('tasks.create', () => {
  it('rejects an unauthenticated caller', async () => {
    const t = makeTest()
    await expect(t.mutation(api.tasks.create, { title: 'Nope' })).rejects.toThrow(
      /Not authenticated/
    )
  })

  it('rejects an empty title', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await expect(t.withIdentity(ADA).mutation(api.tasks.create, { title: '   ' })).rejects.toThrow(
      /needs a title/
    )
  })
})

describe('tasks.toggle', () => {
  it('marks done with a completion instant, then reopens it', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await t.withIdentity(ADA).mutation(api.tasks.create, { title: 'Read a chapter' })
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
    await t.withIdentity(ADA).mutation(api.tasks.create, { title: 'Ada private' })
    const [adaTask] = await tasksOf(t)

    await expect(
      t.withIdentity(BOB).mutation(api.tasks.toggle, { taskId: adaTask._id })
    ).rejects.toThrow(/Task not found/)

    const bobTasks = await t.withIdentity(BOB).query(api.tasks.listMine, { dayStart: 0 })
    expect(bobTasks).toEqual([])
  })
})

describe('tasks.rename', () => {
  it('rejects an unauthenticated caller', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await t.withIdentity(ADA).mutation(api.tasks.create, { title: 'Read a chapter' })
    const [task] = await tasksOf(t)

    await expect(
      t.mutation(api.tasks.rename, { taskId: task._id, title: 'Read two' })
    ).rejects.toThrow(/Not authenticated/)
  })

  it('renames an Open task, trimming the title', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await t.withIdentity(ADA).mutation(api.tasks.create, { title: 'Read a chapter' })
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
    await t.withIdentity(ADA).mutation(api.tasks.create, { title: 'Read a chapter' })
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
    await t.withIdentity(ADA).mutation(api.tasks.create, { title: 'Read a chapter' })
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
    await t.withIdentity(ADA).mutation(api.tasks.create, { title: 'Ada private' })
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
    await t.withIdentity(ADA).mutation(api.tasks.create, { title: 'Read a chapter' })
    const [task] = await tasksOf(t)

    await expect(t.mutation(api.tasks.remove, { taskId: task._id })).rejects.toThrow(
      /Not authenticated/
    )
  })

  it('deletes an Open task', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await t.withIdentity(ADA).mutation(api.tasks.create, { title: 'Read a chapter' })
    const [task] = await tasksOf(t)

    await t.withIdentity(ADA).mutation(api.tasks.remove, { taskId: task._id })

    expect(await tasksOf(t)).toEqual([])
  })

  it('deletes a Done task', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await t.withIdentity(ADA).mutation(api.tasks.create, { title: 'Read a chapter' })
    const [task] = await tasksOf(t)
    await t.withIdentity(ADA).mutation(api.tasks.toggle, { taskId: task._id })

    await t.withIdentity(ADA).mutation(api.tasks.remove, { taskId: task._id })

    expect(await tasksOf(t)).toEqual([])
  })

  it('refuses to delete another member task', async () => {
    const t = makeTest()
    await seedUser(t, ADA, 'Ada')
    await seedUser(t, BOB, 'Bob')
    await t.withIdentity(ADA).mutation(api.tasks.create, { title: 'Ada private' })
    const [adaTask] = await tasksOf(t)

    await expect(
      t.withIdentity(BOB).mutation(api.tasks.remove, { taskId: adaTask._id })
    ).rejects.toThrow(/Task not found/)

    expect(await tasksOf(t)).toHaveLength(1)
  })
})
