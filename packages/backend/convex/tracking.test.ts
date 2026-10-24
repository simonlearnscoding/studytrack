/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { beforeAll, describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

const SECRET = 'test-secret'
const IDENTITY = { subject: 'clerk-1' }

beforeAll(() => {
  process.env.BOT_SHARED_SECRET = SECRET
})

function makeTest() {
  return convexTest(schema, modules)
}

type Test = ReturnType<typeof makeTest>

async function seedMember(t: Test) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      clerkUserId: IDENTITY.subject,
      discordId: 'discord-1',
      name: 'Ada',
      createdAt: Date.now(),
    })
  })
}

async function workSessionsOf(t: Test) {
  return await t.run(async (ctx) => await ctx.db.query('workSession').collect())
}

async function partialsOf(t: Test) {
  return await t.run(async (ctx) => await ctx.db.query('workSessionPartial').collect())
}

describe('tracking.getMine', () => {
  it('returns null when unauthenticated', async () => {
    const t = makeTest()
    expect(await t.query(api.tracking.getMine)).toBeNull()
  })

  it('reports nothing running for a synced member with no workSession', async () => {
    const t = makeTest()
    await seedMember(t)
    expect(await t.withIdentity(IDENTITY).query(api.tracking.getMine)).toEqual({
      mode: null,
      startedAt: null,
    })
  })
})

describe('tracking.start', () => {
  it('rejects an unauthenticated caller', async () => {
    const t = makeTest()
    await expect(t.mutation(api.tracking.start)).rejects.toThrow(/Not authenticated/)
  })

  it('opens a manual workSession and its partial', async () => {
    const t = makeTest()
    await seedMember(t)
    await t.withIdentity(IDENTITY).mutation(api.tracking.start)

    const workSessions = await workSessionsOf(t)
    expect(workSessions).toHaveLength(1)
    expect(workSessions[0]).toMatchObject({ discordId: 'discord-1', status: 'active' })
    expect(workSessions[0].guildId).toBeUndefined()

    const partials = await partialsOf(t)
    expect(partials).toHaveLength(1)
    expect(partials[0]).toMatchObject({ mode: 'manual', status: 'active' })
    expect(partials[0].channelId).toBeUndefined()
    expect(partials[0].guildId).toBeUndefined()

    expect(await t.withIdentity(IDENTITY).query(api.tracking.getMine)).toMatchObject({
      mode: 'manual',
    })
  })

  it('rejects while a Discord workSession is already active', async () => {
    const t = makeTest()
    const userId = await seedMember(t)
    await t.run(async (ctx) => {
      const workSessionId = await ctx.db.insert('workSession', {
        discordId: 'discord-1',
        userId,
        guildId: 'guild-1',
        status: 'active',
        startedAt: Date.now(),
      })
      await ctx.db.insert('workSessionPartial', {
        workSessionId,
        discordId: 'discord-1',
        userId,
        guildId: 'guild-1',
        channelId: 'chan-a',
        mode: 'voice',
        status: 'active',
        startedAt: Date.now(),
      })
    })

    await expect(t.withIdentity(IDENTITY).mutation(api.tracking.start)).rejects.toThrow(
      /already studying in Discord/
    )
    // No second workSession was created.
    expect(await workSessionsOf(t)).toHaveLength(1)
  })

  it('rejects a second start while already tracking', async () => {
    const t = makeTest()
    await seedMember(t)
    await t.withIdentity(IDENTITY).mutation(api.tracking.start)
    await expect(t.withIdentity(IDENTITY).mutation(api.tracking.start)).rejects.toThrow(
      /already tracking/
    )
  })
})

describe('tracking.stop', () => {
  it('closes the manual partial and workSession', async () => {
    const t = makeTest()
    await seedMember(t)
    await t.withIdentity(IDENTITY).mutation(api.tracking.start)
    await t.withIdentity(IDENTITY).mutation(api.tracking.stop)

    const workSessions = await workSessionsOf(t)
    expect(workSessions[0]).toMatchObject({ status: 'ended' })
    expect(workSessions[0].endedAt).toBeTypeOf('number')

    const partials = await partialsOf(t)
    expect(partials[0]).toMatchObject({ status: 'ended' })
    expect(partials[0].durationMs).toBeTypeOf('number')

    expect(await t.withIdentity(IDENTITY).query(api.tracking.getMine)).toEqual({
      mode: null,
      startedAt: null,
    })
  })

  it('never stops a Discord workSession', async () => {
    const t = makeTest()
    const userId = await seedMember(t)
    await t.run(async (ctx) => {
      const workSessionId = await ctx.db.insert('workSession', {
        discordId: 'discord-1',
        userId,
        guildId: 'guild-1',
        status: 'active',
        startedAt: Date.now(),
      })
      await ctx.db.insert('workSessionPartial', {
        workSessionId,
        discordId: 'discord-1',
        userId,
        guildId: 'guild-1',
        channelId: 'chan-a',
        mode: 'camera',
        status: 'active',
        startedAt: Date.now(),
      })
    })

    await t.withIdentity(IDENTITY).mutation(api.tracking.stop)
    expect((await workSessionsOf(t))[0].status).toBe('active')
  })
})

describe('manual precedence (overtake)', () => {
  it('continues the same workSession in the Discord mode when voice is joined', async () => {
    const t = makeTest()
    await seedMember(t)
    await t.withIdentity(IDENTITY).mutation(api.tracking.start)

    const before = (await workSessionsOf(t))[0]

    await t.mutation(api.bot.recordVoiceEvent, {
      secret: SECRET,
      discordId: 'discord-1',
      discordUsername: 'discord-user',
      guildId: 'guild-1',
      from: { channelId: null, camera: false, screenShare: false },
      to: { channelId: 'chan-a', camera: true, screenShare: false },
    })

    // Same workSession, now carrying the Discord identity.
    const workSessions = await workSessionsOf(t)
    expect(workSessions).toHaveLength(1)
    expect(workSessions[0]._id).toBe(before._id)
    expect(workSessions[0].startedAt).toBe(before.startedAt)
    expect(workSessions[0]).toMatchObject({
      status: 'active',
      discordId: 'discord-1',
      guildId: 'guild-1',
    })

    // The manual partial is closed; a camera partial runs on the same workSession.
    const partials = await partialsOf(t)
    expect(partials).toHaveLength(2)
    expect(partials.find((p) => p.mode === 'manual')).toMatchObject({ status: 'ended' })
    expect(partials.find((p) => p.status === 'active')).toMatchObject({
      mode: 'camera',
      channelId: 'chan-a',
    })
    expect(partials.every((p) => p.workSessionId === before._id)).toBe(true)
  })
})
