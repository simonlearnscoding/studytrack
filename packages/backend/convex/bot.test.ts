/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { beforeAll, describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'
import type { VoiceSnapshot } from './bot/types'

const modules = import.meta.glob('./**/*.ts')

const GUILD = 'guild-1'
const SECRET = 'test-secret'

beforeAll(() => {
  process.env.BOT_SHARED_SECRET = SECRET
})

function makeTest() {
  return convexTest(schema, modules)
}

type Test = ReturnType<typeof makeTest>

function snap(overrides: Partial<VoiceSnapshot> = {}): VoiceSnapshot {
  return { channelId: null, camera: false, screenShare: false, ...overrides }
}

function voiceEvent(
  from: VoiceSnapshot,
  to: VoiceSnapshot,
  overrides: Partial<{
    secret: string
    discordId: string
    discordUsername: string
    guildId: string
  }> = {}
) {
  return {
    secret: SECRET,
    discordId: 'discord-1',
    discordUsername: 'discord-user',
    guildId: GUILD,
    from,
    to,
    ...overrides,
  }
}

async function sessionsOf(t: Test) {
  return await t.run(async (ctx) => await ctx.db.query('session').collect())
}

async function partialsOf(t: Test) {
  return await t.run(async (ctx) => await ctx.db.query('sessionPartial').collect())
}

describe('bot.recordVoiceEvent', () => {
  it('rejects a bad secret', async () => {
    const t = makeTest()
    await expect(
      t.mutation(api.bot.recordVoiceEvent, voiceEvent(snap(), snap(), { secret: 'nope' }))
    ).rejects.toThrow(/Unauthorized/)
  })

  it('opens a session and its first partial on joining', async () => {
    const t = makeTest()
    const res = await t.mutation(
      api.bot.recordVoiceEvent,
      voiceEvent(snap(), snap({ channelId: 'chan-a' }))
    )
    expect(res).toEqual({ started: true })

    const sessions = await sessionsOf(t)
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({ discordId: 'discord-1', guildId: GUILD, status: 'active' })

    const partials = await partialsOf(t)
    expect(partials).toHaveLength(1)
    expect(partials[0]).toMatchObject({ channelId: 'chan-a', mode: 'voice', status: 'active' })
    expect(partials[0].sessionId).toBe(sessions[0]._id)
    expect(partials[0].durationMs).toBeUndefined()

    // The bot upserts the user (with the Discord username) and links the session.
    const users = await t.run(async (ctx) => await ctx.db.query('users').collect())
    expect(users).toHaveLength(1)
    expect(users[0]).toMatchObject({ discordId: 'discord-1', name: 'discord-user' })
    expect(sessions[0].userId).toBe(users[0]._id)
  })

  it('records the mode the member joined in', async () => {
    const t = makeTest()
    await t.mutation(
      api.bot.recordVoiceEvent,
      voiceEvent(snap(), snap({ channelId: 'chan-a', camera: true, screenShare: true }))
    )
    expect((await partialsOf(t))[0].mode).toBe('cameraAndScreenShare')
  })

  it('does nothing when neither the channel nor the mode changed', async () => {
    const t = makeTest()
    await t.mutation(api.bot.recordVoiceEvent, voiceEvent(snap(), snap({ channelId: 'chan-a' })))
    const res = await t.mutation(
      api.bot.recordVoiceEvent,
      voiceEvent(snap({ channelId: 'chan-a' }), snap({ channelId: 'chan-a' }))
    )
    expect(res).toEqual({ ignored: 'no-op' })
    expect(await partialsOf(t)).toHaveLength(1)
  })

  it('opens a new partial on the same session when the mode changes', async () => {
    const t = makeTest()
    await t.mutation(api.bot.recordVoiceEvent, voiceEvent(snap(), snap({ channelId: 'chan-a' })))
    const res = await t.mutation(
      api.bot.recordVoiceEvent,
      voiceEvent(snap({ channelId: 'chan-a' }), snap({ channelId: 'chan-a', camera: true }))
    )
    expect(res).toEqual({ started: true })

    // Same session, a second partial.
    expect(await sessionsOf(t)).toHaveLength(1)
    const partials = await partialsOf(t)
    expect(partials).toHaveLength(2)
    const active = partials.find((p) => p.status === 'active')
    const ended = partials.find((p) => p.status === 'ended')
    expect(active).toMatchObject({ channelId: 'chan-a', mode: 'camera' })
    expect(ended).toMatchObject({ channelId: 'chan-a', mode: 'voice' })
    expect(ended?.durationMs).toBeTypeOf('number')
  })

  it('opens a new partial on the same session when moving channels', async () => {
    const t = makeTest()
    await t.mutation(api.bot.recordVoiceEvent, voiceEvent(snap(), snap({ channelId: 'chan-a' })))
    const res = await t.mutation(
      api.bot.recordVoiceEvent,
      voiceEvent(snap({ channelId: 'chan-a' }), snap({ channelId: 'chan-b' }))
    )
    expect(res).toEqual({ started: true })

    expect(await sessionsOf(t)).toHaveLength(1)
    const partials = await partialsOf(t)
    expect(partials).toHaveLength(2)
    expect(partials.find((p) => p.status === 'ended')?.channelId).toBe('chan-a')
    expect(partials.find((p) => p.status === 'active')?.channelId).toBe('chan-b')
  })

  it('ends the session and its partial on leaving voice', async () => {
    const t = makeTest()
    await t.mutation(api.bot.recordVoiceEvent, voiceEvent(snap(), snap({ channelId: 'chan-a' })))
    const res = await t.mutation(
      api.bot.recordVoiceEvent,
      voiceEvent(snap({ channelId: 'chan-a' }), snap())
    )
    expect(res).toEqual({ ended: 1 })

    const sessions = await sessionsOf(t)
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({ status: 'ended' })
    expect(sessions[0].endedAt).toBeTypeOf('number')

    const partials = await partialsOf(t)
    expect(partials).toHaveLength(1)
    expect(partials[0]).toMatchObject({ status: 'ended' })
    expect(partials[0].durationMs).toBeTypeOf('number')
  })

  it('reopens the session with a break partial when re-joining within 30 minutes', async () => {
    const t = makeTest()
    await t.mutation(api.bot.recordVoiceEvent, voiceEvent(snap(), snap({ channelId: 'chan-a' })))
    await t.mutation(api.bot.recordVoiceEvent, voiceEvent(snap({ channelId: 'chan-a' }), snap()))
    const res = await t.mutation(
      api.bot.recordVoiceEvent,
      voiceEvent(snap(), snap({ channelId: 'chan-b' }))
    )
    expect(res).toEqual({ started: true })

    // Same session, reopened.
    const sessions = await sessionsOf(t)
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({ status: 'active' })
    expect(sessions[0].endedAt).toBeUndefined()

    // Original partial, a break partial for the gap, and the new active partial.
    const partials = await partialsOf(t)
    expect(partials).toHaveLength(3)
    expect(partials.every((p) => p.sessionId === sessions[0]._id)).toBe(true)

    const brk = partials.find((p) => p.mode === 'break')
    expect(brk?.status).toBe('ended')
    expect(brk?.channelId).toBeUndefined()
    expect(brk?.durationMs).toBeTypeOf('number')
    expect(partials.find((p) => p.status === 'active')?.channelId).toBe('chan-b')
  })
})
