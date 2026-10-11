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

async function sessionsOf(t: Test) {
  return await t.run(async (ctx) => await ctx.db.query('session').collect())
}

async function partialsOf(t: Test) {
  return await t.run(async (ctx) => await ctx.db.query('sessionPartial').collect())
}

describe('tracking.getMine', () => {
  it('returns null when unauthenticated', async () => {
    const t = makeTest()
    expect(await t.query(api.tracking.getMine)).toBeNull()
  })

  it('reports nothing running for a synced member with no session', async () => {
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

  it('opens a manual session and its partial', async () => {
    const t = makeTest()
    await seedMember(t)
    await t.withIdentity(IDENTITY).mutation(api.tracking.start)

    const sessions = await sessionsOf(t)
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({ discordId: 'discord-1', status: 'active' })
    expect(sessions[0].guildId).toBeUndefined()

    const partials = await partialsOf(t)
    expect(partials).toHaveLength(1)
    expect(partials[0]).toMatchObject({ mode: 'manual', status: 'active' })
    expect(partials[0].channelId).toBeUndefined()
    expect(partials[0].guildId).toBeUndefined()

    expect(await t.withIdentity(IDENTITY).query(api.tracking.getMine)).toMatchObject({
      mode: 'manual',
    })
  })

  it('rejects while a Discord session is already active', async () => {
    const t = makeTest()
    const userId = await seedMember(t)
    await t.run(async (ctx) => {
      const sessionId = await ctx.db.insert('session', {
        discordId: 'discord-1',
        userId,
        guildId: 'guild-1',
        status: 'active',
        startedAt: Date.now(),
      })
      await ctx.db.insert('sessionPartial', {
        sessionId,
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
    // No second session was created.
    expect(await sessionsOf(t)).toHaveLength(1)
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
  it('closes the manual partial and session', async () => {
    const t = makeTest()
    await seedMember(t)
    await t.withIdentity(IDENTITY).mutation(api.tracking.start)
    await t.withIdentity(IDENTITY).mutation(api.tracking.stop)

    const sessions = await sessionsOf(t)
    expect(sessions[0]).toMatchObject({ status: 'ended' })
    expect(sessions[0].endedAt).toBeTypeOf('number')

    const partials = await partialsOf(t)
    expect(partials[0]).toMatchObject({ status: 'ended' })
    expect(partials[0].durationMs).toBeTypeOf('number')

    expect(await t.withIdentity(IDENTITY).query(api.tracking.getMine)).toEqual({
      mode: null,
      startedAt: null,
    })
  })

  it('never stops a Discord session', async () => {
    const t = makeTest()
    const userId = await seedMember(t)
    await t.run(async (ctx) => {
      const sessionId = await ctx.db.insert('session', {
        discordId: 'discord-1',
        userId,
        guildId: 'guild-1',
        status: 'active',
        startedAt: Date.now(),
      })
      await ctx.db.insert('sessionPartial', {
        sessionId,
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
    expect((await sessionsOf(t))[0].status).toBe('active')
  })
})

describe('manual precedence (overtake)', () => {
  it('continues the same session in the Discord mode when voice is joined', async () => {
    const t = makeTest()
    await seedMember(t)
    await t.withIdentity(IDENTITY).mutation(api.tracking.start)

    const before = (await sessionsOf(t))[0]

    await t.mutation(api.bot.recordVoiceEvent, {
      secret: SECRET,
      discordId: 'discord-1',
      discordUsername: 'discord-user',
      guildId: 'guild-1',
      from: { channelId: null, camera: false, screenShare: false },
      to: { channelId: 'chan-a', camera: true, screenShare: false },
    })

    // Same session, now carrying the Discord identity.
    const sessions = await sessionsOf(t)
    expect(sessions).toHaveLength(1)
    expect(sessions[0]._id).toBe(before._id)
    expect(sessions[0].startedAt).toBe(before.startedAt)
    expect(sessions[0]).toMatchObject({
      status: 'active',
      discordId: 'discord-1',
      guildId: 'guild-1',
    })

    // The manual partial is closed; a camera partial runs on the same session.
    const partials = await partialsOf(t)
    expect(partials).toHaveLength(2)
    expect(partials.find((p) => p.mode === 'manual')).toMatchObject({ status: 'ended' })
    expect(partials.find((p) => p.status === 'active')).toMatchObject({
      mode: 'camera',
      channelId: 'chan-a',
    })
    expect(partials.every((p) => p.sessionId === before._id)).toBe(true)
  })
})
