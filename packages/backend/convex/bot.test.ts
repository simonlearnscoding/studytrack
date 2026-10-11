/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { beforeAll, describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

const GUILD = 'guild-1'
const STUDY = 'chan-study'
const OTHER = 'chan-other'
const SECRET = 'test-secret'

beforeAll(() => {
  process.env.BOT_SHARED_SECRET = SECRET
})

async function setup() {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    await ctx.db.insert('guildSettings', {
      guildId: GUILD,
      studyChannelIds: [STUDY],
      updatedAt: Date.now(),
    })
  })
  return t
}

function voiceEvent(
  overrides: Partial<{
    secret: string
    discordId: string
    guildId: string
    fromChannelId: string | null
    toChannelId: string | null
  }> = {}
) {
  return {
    secret: SECRET,
    discordId: 'discord-1',
    guildId: GUILD,
    fromChannelId: null,
    toChannelId: null,
    ...overrides,
  }
}

async function sessionsOf(t: Awaited<ReturnType<typeof setup>>) {
  return await t.run(async (ctx) => await ctx.db.query('studySessions').collect())
}

describe('bot.recordVoiceEvent', () => {
  it('rejects a bad secret', async () => {
    const t = await setup()
    await expect(
      t.mutation(api.bot.recordVoiceEvent, voiceEvent({ secret: 'nope' }))
    ).rejects.toThrow(/Unauthorized/)
  })

  it('ignores a guild with no config', async () => {
    const t = convexTest(schema, modules)
    const res = await t.mutation(api.bot.recordVoiceEvent, voiceEvent({ guildId: 'unknown' }))
    expect(res).toEqual({ ignored: 'no-guild-config' })
  })

  it('opens a session on entering a study channel', async () => {
    const t = await setup()
    const res = await t.mutation(api.bot.recordVoiceEvent, voiceEvent({ toChannelId: STUDY }))
    expect(res).toEqual({ started: true })

    const rows = await sessionsOf(t)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      discordId: 'discord-1',
      guildId: GUILD,
      channelId: STUDY,
      status: 'active',
    })
    expect(rows[0].durationMs).toBeUndefined()
  })

  it('does not open a second session when one is already active', async () => {
    const t = await setup()
    await t.mutation(api.bot.recordVoiceEvent, voiceEvent({ toChannelId: STUDY }))
    const res = await t.mutation(
      api.bot.recordVoiceEvent,
      voiceEvent({ fromChannelId: OTHER, toChannelId: STUDY })
    )
    expect(res).toEqual({ ignored: 'already-active' })
    expect(await sessionsOf(t)).toHaveLength(1)
  })

  it('closes the active session on leaving the study channel', async () => {
    const t = await setup()
    await t.mutation(api.bot.recordVoiceEvent, voiceEvent({ toChannelId: STUDY }))
    const res = await t.mutation(
      api.bot.recordVoiceEvent,
      voiceEvent({ fromChannelId: STUDY, toChannelId: null })
    )
    expect(res).toEqual({ ended: 1 })

    const rows = await sessionsOf(t)
    expect(rows[0]).toMatchObject({ status: 'ended' })
    expect(rows[0].endedAt).toBeTypeOf('number')
    expect(rows[0].durationMs).toBeTypeOf('number')
  })
})
