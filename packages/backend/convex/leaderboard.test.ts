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

// 2026-06-15 is a Monday. 12:00 Zurich is UTC+2; local midnight (the Day and the
// Week) is 2026-06-14 22:00 UTC. The Month starts on the 1st.
const DAY_START = Date.UTC(2026, 5, 14, 22, 0, 0)
const NOW = Date.UTC(2026, 5, 15, 10, 0, 0)
const WEEK_START = DAY_START
const MONTH_START = Date.UTC(2026, 4, 31, 22, 0, 0)

beforeAll(() => {
  process.env.BOT_SHARED_SECRET = SECRET
})

function makeTest() {
  return convexTest(schema, modules)
}

type Test = ReturnType<typeof makeTest>

function queryArgs(
  overrides: Partial<{
    secret: string
    now: number
    dayStart: number
    weekStart: number
    monthStart: number
  }> = {}
) {
  return {
    secret: SECRET,
    now: NOW,
    dayStart: DAY_START,
    weekStart: WEEK_START,
    monthStart: MONTH_START,
    ...overrides,
  }
}

async function addUser(t: Test, discordId: string, name: string) {
  await t.run(async (ctx) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_discordId', (q) => q.eq('discordId', discordId))
      .first()
    if (!existing) await ctx.db.insert('users', { discordId, name, createdAt: NOW })
  })
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

async function addPastDay(
  t: Test,
  opts: {
    discordId: string
    dayStart: number
    deepFocusMs: number
    totalMs: number
    studyMs?: number
  }
) {
  await t.run(async (ctx) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_discordId', (q) => q.eq('discordId', opts.discordId))
      .first()
    await ctx.db.insert('dailyTotal', {
      memberKey: opts.discordId,
      discordId: opts.discordId,
      userId: user?._id,
      dayStart: opts.dayStart,
      studyMs: opts.studyMs ?? opts.totalMs,
      deepFocusMs: opts.deepFocusMs,
      totalMs: opts.totalMs,
    })
  })
}

describe('leaderboard.getBoards', () => {
  it('rejects a bad secret', async () => {
    const t = makeTest()
    await expect(t.query(api.leaderboard.getBoards, queryArgs({ secret: 'nope' }))).rejects.toThrow(
      /Unauthorized/
    )
  })

  it('returns three empty boards when nobody studied', async () => {
    const t = makeTest()
    const boards = await t.query(api.leaderboard.getBoards, queryArgs())
    expect(boards).toEqual({ today: [], week: [], month: [] })
  })

  it('adds past Daily totals to today live time for the Week and Month', async () => {
    const t = makeTest()
    await addUser(t, 'ada', 'Ada')
    // 40m Deep focus, 1h Total earlier in the Week (Tue 9 June).
    await addPastDay(t, {
      discordId: 'ada',
      dayStart: Date.UTC(2026, 5, 8, 22, 0, 0),
      deepFocusMs: 40 * M,
      totalMs: 1 * H,
    })
    // 30m camera today.
    await addSession(t, {
      discordId: 'ada',
      name: 'Ada',
      mode: 'camera',
      startedAt: NOW - 2 * H,
      endedAt: NOW - 90 * M,
    })

    // The Week started the previous Monday, so the 9 June row is inside it.
    const boards = await t.query(
      api.leaderboard.getBoards,
      queryArgs({ weekStart: Date.UTC(2026, 5, 7, 22, 0, 0) })
    )

    expect(boards.today[0]).toMatchObject({ name: 'Ada', deepFocusMs: 30 * M, totalMs: 30 * M })
    expect(boards.week[0]).toMatchObject({ name: 'Ada', deepFocusMs: 70 * M, totalMs: 90 * M })
    expect(boards.month[0]).toMatchObject({ name: 'Ada', deepFocusMs: 70 * M, totalMs: 90 * M })
  })

  it('makes the Week equal Today on a Monday', async () => {
    const t = makeTest()
    await addUser(t, 'ada', 'Ada')
    // A row that belongs to yesterday; on a Monday it is before the Week.
    await addPastDay(t, {
      discordId: 'ada',
      dayStart: DAY_START - 24 * H,
      deepFocusMs: 5 * H,
      totalMs: 5 * H,
    })
    await addSession(t, {
      discordId: 'ada',
      name: 'Ada',
      mode: 'camera',
      startedAt: NOW - 30 * M,
      endedAt: NOW,
    })

    const boards = await t.query(api.leaderboard.getBoards, queryArgs())

    expect(boards.today).toHaveLength(1)
    expect(boards.week).toEqual(boards.today)
    expect(boards.today[0]).toMatchObject({ deepFocusMs: 30 * M })
  })

  it('keeps a member with no study today on the Week and Month', async () => {
    const t = makeTest()
    await addUser(t, 'bob', 'Bob')
    await addPastDay(t, {
      discordId: 'bob',
      dayStart: Date.UTC(2026, 5, 9, 22, 0, 0),
      deepFocusMs: 45 * M,
      totalMs: 1 * H,
    })

    const boards = await t.query(
      api.leaderboard.getBoards,
      queryArgs({ weekStart: Date.UTC(2026, 5, 7, 22, 0, 0) })
    )

    expect(boards.today).toEqual([])
    expect(boards.week[0]).toMatchObject({ discordId: 'bob', name: 'Bob', deepFocusMs: 45 * M })
    expect(boards.month[0]).toMatchObject({ discordId: 'bob', deepFocusMs: 45 * M })
  })

  it('clips a live session that straddled midnight to today', async () => {
    const t = makeTest()
    const start = DAY_START - 30 * M
    await addSession(t, {
      discordId: 'ada',
      name: 'Ada',
      mode: 'camera',
      startedAt: start,
      endedAt: undefined,
    })

    const boards = await t.query(api.leaderboard.getBoards, queryArgs({ now: DAY_START + 30 * M }))

    expect(boards.today[0]).toMatchObject({ deepFocusMs: 30 * M, totalMs: 30 * M, online: true })
  })

  it('counts a screen-share-only session as Deep focus', async () => {
    const t = makeTest()
    await addSession(t, {
      discordId: 'ada',
      name: 'Ada',
      mode: 'screenShare',
      startedAt: NOW - 30 * M,
      endedAt: NOW,
    })

    const boards = await t.query(api.leaderboard.getBoards, queryArgs())

    expect(boards.today[0]).toMatchObject({ name: 'Ada', deepFocusMs: 30 * M, totalMs: 30 * M })
  })

  it('caps every board at ten and orders by Deep focus', async () => {
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

    const boards = await t.query(api.leaderboard.getBoards, queryArgs())

    for (const rows of [boards.today, boards.week, boards.month]) {
      expect(rows).toHaveLength(10)
      expect(rows[0].name).toBe('Member 11')
    }
  })
})
