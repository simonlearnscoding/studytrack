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
// The focus day a Week earlier: Monday 8 June, so its Week is 8–14 June (inside
// the current Month but before today).
const PREV_WEEK_FOCUS = Date.UTC(2026, 5, 7, 22, 0, 0)
// Fri 15 May: a focus day whose Week and Month both fall before today's.
const MAY_FOCUS = Date.UTC(2026, 4, 14, 22, 0, 0)

beforeAll(() => {
  process.env.BOT_SHARED_SECRET = SECRET
})

function makeTest() {
  return convexTest(schema, modules)
}

type Test = ReturnType<typeof makeTest>

// The two instants every board is computed against: focus = today by default.
// The viewer read takes these and no secret.
const WINDOWS = {
  now: NOW,
  focusDayStart: DAY_START,
}

function queryArgs(
  overrides: Partial<{ secret: string; now: number; focusDayStart: number }> = {}
) {
  return { secret: SECRET, ...WINDOWS, ...overrides }
}

function viewerArgs(overrides: Partial<typeof WINDOWS> = {}) {
  return { ...WINDOWS, ...overrides }
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

async function addWorkSession(
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
    const workSessionId = await ctx.db.insert('workSession', {
      discordId: opts.discordId,
      userId,
      guildId: GUILD,
      status: opts.endedAt === undefined ? 'active' : 'ended',
      startedAt: opts.startedAt,
      endedAt: opts.endedAt,
    })
    await ctx.db.insert('workSessionPartial', {
      workSessionId,
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
    expect(boards).toEqual({ today: [], day: [], week: [], month: [] })
  })

  it('adds today live time to the Week and Month of a focus day in the current week', async () => {
    const t = makeTest()
    await addUser(t, 'ada', 'Ada')
    // 40m Deep focus, 1h Total earlier in the Month (Tue 9 June).
    await addPastDay(t, {
      discordId: 'ada',
      dayStart: Date.UTC(2026, 5, 8, 22, 0, 0),
      deepFocusMs: 40 * M,
      totalMs: 1 * H,
    })
    // 30m camera today.
    await addWorkSession(t, {
      discordId: 'ada',
      name: 'Ada',
      mode: 'camera',
      startedAt: NOW - 2 * H,
      endedAt: NOW - 90 * M,
    })

    // Focus = today (Mon 15 June): the Week is 15–21 June, so the 9 June row is
    // before it; the Month (June) still contains both.
    const boards = await t.query(api.leaderboard.getBoards, queryArgs())

    expect(boards.today[0]).toMatchObject({ name: 'Ada', deepFocusMs: 30 * M, totalMs: 30 * M })
    expect(boards.week[0]).toMatchObject({ name: 'Ada', deepFocusMs: 30 * M, totalMs: 30 * M })
    expect(boards.month[0]).toMatchObject({ name: 'Ada', deepFocusMs: 70 * M, totalMs: 90 * M })
  })

  it('makes the Week a pure sum and keeps the Month live for a focus day in a past week', async () => {
    const t = makeTest()
    await addUser(t, 'ada', 'Ada')
    // 40m Deep focus, 1h Total on Tue 9 June — inside the focus day's Week.
    await addPastDay(t, {
      discordId: 'ada',
      dayStart: Date.UTC(2026, 5, 8, 22, 0, 0),
      deepFocusMs: 40 * M,
      totalMs: 1 * H,
    })
    // 30m camera today (Wed 15 June, a later week in the same Month).
    await addWorkSession(t, {
      discordId: 'ada',
      name: 'Ada',
      mode: 'camera',
      startedAt: NOW - 2 * H,
      endedAt: NOW - 90 * M,
    })

    // Focus = Mon 8 June: the Week (8–14 June) is a pure sum, and the Month still
    // contains today, so its live minutes are merged in.
    const boards = await t.query(
      api.leaderboard.getBoards,
      queryArgs({ focusDayStart: PREV_WEEK_FOCUS })
    )

    expect(boards.week[0]).toMatchObject({ name: 'Ada', deepFocusMs: 40 * M, totalMs: 1 * H })
    expect(boards.month[0]).toMatchObject({ name: 'Ada', deepFocusMs: 70 * M, totalMs: 90 * M })
  })

  it('makes the Week and Month pure sums for a focus day in a past Month', async () => {
    const t = makeTest()
    await addUser(t, 'ada', 'Ada')
    // A row inside the focus day's May Week.
    await addPastDay(t, {
      discordId: 'ada',
      dayStart: MAY_FOCUS,
      deepFocusMs: 30 * M,
      totalMs: 45 * M,
    })
    // A row in June, after the focus Month, which must not leak in.
    await addPastDay(t, {
      discordId: 'ada',
      dayStart: Date.UTC(2026, 5, 8, 22, 0, 0),
      deepFocusMs: 40 * M,
      totalMs: 1 * H,
    })
    await addWorkSession(t, {
      discordId: 'ada',
      name: 'Ada',
      mode: 'camera',
      startedAt: NOW - 20 * M,
      endedAt: NOW,
    })

    const boards = await t.query(api.leaderboard.getBoards, queryArgs({ focusDayStart: MAY_FOCUS }))

    expect(boards.week[0]).toMatchObject({ name: 'Ada', deepFocusMs: 30 * M, totalMs: 45 * M })
    expect(boards.month[0]).toMatchObject({ name: 'Ada', deepFocusMs: 30 * M, totalMs: 45 * M })
    // Today is unaffected by the focus day.
    expect(boards.today[0]).toMatchObject({ deepFocusMs: 20 * M })
  })

  it('returns empty Week and Month for a future focus day', async () => {
    const t = makeTest()
    await addUser(t, 'ada', 'Ada')
    await addPastDay(t, {
      discordId: 'ada',
      dayStart: DAY_START - 24 * H,
      deepFocusMs: 40 * M,
      totalMs: 1 * H,
    })
    await addWorkSession(t, {
      discordId: 'ada',
      name: 'Ada',
      mode: 'camera',
      startedAt: NOW - 30 * M,
      endedAt: NOW,
    })

    // A day in July: both its Week and Month lie wholly in the future.
    const future = Date.UTC(2026, 6, 15, 10, 0, 0)
    const boards = await t.query(api.leaderboard.getBoards, queryArgs({ focusDayStart: future }))

    expect(boards.week).toEqual([])
    expect(boards.month).toEqual([])
    expect(boards.today[0]).toMatchObject({ deepFocusMs: 30 * M })
  })

  it('builds the Day board from the focus day alone', async () => {
    const t = makeTest()
    await addUser(t, 'ada', 'Ada')
    // Tue 9 June: the focus day itself.
    const focusDay = Date.UTC(2026, 5, 8, 22, 0, 0)
    await addPastDay(t, {
      discordId: 'ada',
      dayStart: focusDay,
      deepFocusMs: 40 * M,
      totalMs: 1 * H,
    })
    // Wed 10 June: in the focus day's Week, but not its Day.
    await addPastDay(t, {
      discordId: 'ada',
      dayStart: Date.UTC(2026, 5, 9, 22, 0, 0),
      deepFocusMs: 20 * M,
      totalMs: 20 * M,
    })

    const boards = await t.query(api.leaderboard.getBoards, queryArgs({ focusDayStart: focusDay }))

    expect(boards.day[0]).toMatchObject({ name: 'Ada', deepFocusMs: 40 * M, totalMs: 1 * H })
    expect(boards.week[0]).toMatchObject({ name: 'Ada', deepFocusMs: 60 * M, totalMs: 80 * M })
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
    await addWorkSession(t, {
      discordId: 'ada',
      name: 'Ada',
      mode: 'camera',
      startedAt: NOW - 30 * M,
      endedAt: NOW,
    })

    const boards = await t.query(api.leaderboard.getBoards, queryArgs())

    expect(boards.today).toHaveLength(1)
    expect(boards.week).toEqual(boards.today)
    expect(boards.day).toEqual(boards.today)
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
      queryArgs({ focusDayStart: PREV_WEEK_FOCUS })
    )

    expect(boards.today).toEqual([])
    expect(boards.week[0]).toMatchObject({ discordId: 'bob', name: 'Bob', deepFocusMs: 45 * M })
    expect(boards.month[0]).toMatchObject({ discordId: 'bob', deepFocusMs: 45 * M })
  })

  it('clips a live workSession that straddled midnight to today', async () => {
    const t = makeTest()
    const start = DAY_START - 30 * M
    await addWorkSession(t, {
      discordId: 'ada',
      name: 'Ada',
      mode: 'camera',
      startedAt: start,
      endedAt: undefined,
    })

    const boards = await t.query(api.leaderboard.getBoards, queryArgs({ now: DAY_START + 30 * M }))

    expect(boards.today[0]).toMatchObject({ deepFocusMs: 30 * M, totalMs: 30 * M, online: true })
  })

  it('counts a screen-share-only workSession as Deep focus', async () => {
    const t = makeTest()
    await addWorkSession(t, {
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
      await addWorkSession(t, {
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

describe('leaderboard.getBoardsForViewer', () => {
  it('returns empty boards when unauthenticated', async () => {
    const t = makeTest()
    await addWorkSession(t, {
      discordId: 'ada',
      name: 'Ada',
      mode: 'camera',
      startedAt: NOW - 30 * M,
      endedAt: NOW,
    })

    const boards = await t.query(api.leaderboard.getBoardsForViewer, viewerArgs())
    expect(boards).toEqual({ today: [], day: [], week: [], month: [] })
  })

  it('returns the same three boards as the bot for a signed-in member', async () => {
    const t = makeTest()
    await addUser(t, 'ada', 'Ada')
    await addPastDay(t, {
      discordId: 'ada',
      dayStart: Date.UTC(2026, 5, 8, 22, 0, 0),
      deepFocusMs: 40 * M,
      totalMs: 1 * H,
    })
    await addWorkSession(t, {
      discordId: 'ada',
      name: 'Ada',
      mode: 'camera',
      startedAt: NOW - 2 * H,
      endedAt: NOW - 90 * M,
    })

    // Bot parity on the same focus day: the viewer read and the bot read agree,
    // including the past Week as a pure sum and the live Month.
    const args = viewerArgs({ focusDayStart: PREV_WEEK_FOCUS })
    const viaBot = await t.query(api.leaderboard.getBoards, queryArgs(args))
    const viaViewer = await t
      .withIdentity({ subject: 'clerk-1' })
      .query(api.leaderboard.getBoardsForViewer, args)

    expect(viaViewer).toEqual(viaBot)
    expect(viaViewer.week[0]).toMatchObject({ name: 'Ada', deepFocusMs: 40 * M })
    expect(viaViewer.month[0]).toMatchObject({ name: 'Ada', deepFocusMs: 70 * M })
  })
})
