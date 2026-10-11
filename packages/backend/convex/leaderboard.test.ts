/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { beforeAll, describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'
import type { StudyMode } from './bot/types'

const modules = import.meta.glob('./**/*.ts')

const M = 60 * 1000
const H = 60 * 60 * 1000
const SECRET = 'test-secret'
const GUILD = 'guild-1'

// 2026-06-15 12:00 Zurich (UTC+2 in summer). Local midnight is 2026-06-14 22:00 UTC.
const DAY_START = Date.UTC(2026, 5, 14, 22, 0, 0)
const NOW = Date.UTC(2026, 5, 15, 10, 0, 0)

beforeAll(() => {
  process.env.BOT_SHARED_SECRET = SECRET
})

function makeTest() {
  return convexTest(schema, modules)
}

type Test = ReturnType<typeof makeTest>

function queryArgs(overrides: Partial<{ secret: string; dayStart: number; now: number }> = {}) {
  return { secret: SECRET, dayStart: DAY_START, now: NOW, ...overrides }
}

async function addSession(
  t: Test,
  opts: {
    discordId: string
    name?: string
    mode: StudyMode
    startedAt: number
    endedAt?: number
  }
) {
  await t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {
      discordId: opts.discordId,
      name: opts.name ?? opts.discordId,
      createdAt: NOW,
    })
    const sessionId = await ctx.db.insert('session', {
      discordId: opts.discordId,
      userId,
      guildId: GUILD,
      status: opts.endedAt === undefined ? 'active' : 'ended',
      startedAt: opts.startedAt,
      endedAt: opts.endedAt,
    })
    await ctx.db.insert('sessionPartial', {
      sessionId,
      discordId: opts.discordId,
      userId,
      guildId: GUILD,
      channelId: 'chan-a',
      mode: opts.mode,
      status: opts.endedAt === undefined ? 'active' : 'ended',
      startedAt: opts.startedAt,
      endedAt: opts.endedAt,
      durationMs: opts.endedAt === undefined ? undefined : opts.endedAt - opts.startedAt,
    })
  })
}

describe('leaderboard.getToday', () => {
  it('rejects a bad secret', async () => {
    const t = makeTest()
    await expect(t.query(api.leaderboard.getToday, queryArgs({ secret: 'nope' }))).rejects.toThrow(
      /Unauthorized/
    )
  })

  it('returns an empty board when nobody studied', async () => {
    const t = makeTest()
    const rows = await t.query(api.leaderboard.getToday, queryArgs())
    expect(rows).toEqual([])
  })

  it('ranks by Deep focus and carries names and Total time', async () => {
    const t = makeTest()
    // Ada: 30m camera, then 30m voice — the camera time wins her the top spot.
    await addSession(t, {
      discordId: 'ada',
      name: 'Ada',
      mode: 'camera',
      startedAt: NOW - 2 * H,
      endedAt: NOW - 90 * M,
    })
    await addSession(t, {
      discordId: 'ada',
      name: 'Ada',
      mode: 'voice',
      startedAt: NOW - 90 * M,
      endedAt: NOW - 60 * M,
    })
    // Bob: 2h of voice only — more Study time, but no Deep focus.
    await addSession(t, {
      discordId: 'bob',
      name: 'Bob',
      mode: 'voice',
      startedAt: NOW - 2 * H,
      endedAt: NOW,
    })

    const rows = await t.query(api.leaderboard.getToday, queryArgs())
    expect(rows.map((r) => r.discordId)).toEqual(['ada', 'bob'])
    expect(rows[0]).toMatchObject({
      name: 'Ada',
      deepFocusMs: 30 * M,
      totalMs: 60 * M,
      online: false,
    })
    expect(rows[1]).toMatchObject({ name: 'Bob', deepFocusMs: 0 })
  })

  it('ignores a session that ended before today', async () => {
    const t = makeTest()
    await addSession(t, {
      discordId: 'ada',
      mode: 'camera',
      startedAt: DAY_START - 3 * H,
      endedAt: DAY_START - 2 * H,
    })
    const rows = await t.query(api.leaderboard.getToday, queryArgs())
    expect(rows).toEqual([])
  })

  it('caps the board at ten members', async () => {
    const t = makeTest()
    for (let i = 0; i < 12; i++) {
      await addSession(t, {
        discordId: `member-${i}`,
        name: `Member ${i}`,
        mode: 'camera',
        startedAt: NOW - (i + 1) * M,
        endedAt: NOW,
      })
    }
    const rows = await t.query(api.leaderboard.getToday, queryArgs())
    expect(rows).toHaveLength(10)
    expect(rows[0].name).toBe('Member 11')
  })
})
