import { describe, expect, it } from 'vitest'
import type { Id } from '../_generated/dataModel'
import type { DashboardMember, DashboardPartial, DashboardWorkSession } from '../workSessions/types'
import type { LeaderboardRow, LeaderboardTableRow, LeaderboardTotal } from './types'
import {
  buildTableRows,
  liveTailFor,
  MAX_LEADERBOARD_ROWS,
  rankLiveTableRows,
  rankTotals,
  todaysSettledTotals,
  todaysTotals,
} from './util'

const M = 60 * 1000
const H = 60 * 60 * 1000

// 2026-06-15 12:00 Zurich (UTC+2). Local midnight is 2026-06-14 22:00 UTC.
const DAY_START = Date.UTC(2026, 5, 14, 22, 0, 0)

function partial(overrides: Partial<DashboardPartial> = {}): DashboardPartial {
  return {
    id: 'p1' as Id<'workSessionPartial'>,
    channelId: 'chan-a',
    mode: 'voice',
    startedAt: 0,
    endedAt: null,
    ...overrides,
  }
}

function workSession(partials: DashboardPartial[], overrides: Partial<DashboardWorkSession> = {}) {
  return {
    id: 's1' as Id<'workSession'>,
    status: 'ended' as const,
    startedAt: 0,
    endedAt: null,
    partials,
    tasks: [],
    ...overrides,
  }
}

function member(overrides: Partial<DashboardMember> = {}): DashboardMember {
  return {
    userId: null,
    discordId: 'd1',
    name: null,
    image: null,
    online: false,
    workSessions: [],
    planBlocks: [],
    activeTask: null,
    ...overrides,
  }
}

function row(overrides: Partial<LeaderboardRow> = {}): LeaderboardRow {
  return {
    discordId: 'd1',
    name: 'Ada',
    image: null,
    deepFocusMs: 0,
    totalMs: 0,
    online: false,
    ...overrides,
  }
}

function total(overrides: Partial<LeaderboardTotal> = {}): LeaderboardTotal {
  return { ...row(), userId: null, ...overrides }
}

function tableRow(overrides: Partial<LeaderboardTableRow> = {}): LeaderboardTableRow {
  return {
    discordId: 'd1',
    name: 'Ada',
    image: null,
    day: { deepFocusMs: 0, totalMs: 0 },
    week: { deepFocusMs: 0, totalMs: 0 },
    month: { deepFocusMs: 0, totalMs: 0 },
    live: { deepFocusSince: null, spanSince: null },
    ...overrides,
  }
}

describe('todaysTotals', () => {
  it('counts camera time as Deep focus and the span as Total time', () => {
    const ada = member({
      discordId: 'ada',
      name: 'Ada',
      online: true,
      workSessions: [
        workSession([partial({ mode: 'camera', startedAt: 0, endedAt: 30 * M })], {
          startedAt: 0,
          endedAt: 1 * H,
        }),
      ],
    })
    const [totals] = todaysTotals([ada], 0, 2 * H)
    expect(totals).toMatchObject({ discordId: 'ada', deepFocusMs: 30 * M, totalMs: 1 * H })
  })

  it('counts screen share as Deep focus, but not voice, manual or break', () => {
    const ada = member({
      discordId: 'ada',
      workSessions: [
        workSession([
          partial({ mode: 'screenShare', startedAt: 0, endedAt: 15 * M }),
          partial({ mode: 'voice', startedAt: 15 * M, endedAt: 30 * M }),
          partial({ mode: 'manual', startedAt: 30 * M, endedAt: 45 * M }),
          partial({ mode: 'break', startedAt: 45 * M, endedAt: 1 * H }),
        ]),
      ],
    })
    const [totals] = todaysTotals([ada], 0, 1 * H)
    expect(totals).toMatchObject({ deepFocusMs: 15 * M })
  })

  it('clips a workSession that straddled midnight to the Day', () => {
    const start = DAY_START - 30 * M
    const ada = member({
      discordId: 'ada',
      workSessions: [
        workSession([partial({ mode: 'camera', startedAt: start, endedAt: null })], {
          status: 'active',
          startedAt: start,
          endedAt: null,
        }),
      ],
    })
    const [totals] = todaysTotals([ada], DAY_START, DAY_START + 30 * M)
    expect(totals).toMatchObject({ deepFocusMs: 30 * M, totalMs: 30 * M })
  })

  it('does not count time after now', () => {
    const ada = member({
      workSessions: [
        workSession([partial({ mode: 'camera', startedAt: 0, endedAt: 2 * H })], {
          startedAt: 0,
          endedAt: 2 * H,
        }),
      ],
    })
    const [totals] = todaysTotals([ada], 0, 1 * H)
    expect(totals).toMatchObject({ deepFocusMs: 1 * H, totalMs: 1 * H })
  })
})

describe('todaysSettledTotals', () => {
  it('counts closed time and leaves running time to the live tail', () => {
    const closedStart = DAY_START + 1 * H
    const closed = workSession(
      [partial({ mode: 'camera', startedAt: closedStart, endedAt: closedStart + 30 * M })],
      {
        status: 'ended',
        startedAt: closedStart,
        endedAt: closedStart + 1 * H,
      }
    )
    const runningStart = DAY_START + 3 * H
    const running = workSession(
      [partial({ mode: 'camera', startedAt: runningStart, endedAt: null })],
      {
        status: 'active',
        startedAt: runningStart,
        endedAt: null,
      }
    )
    const ada = member({ discordId: 'ada', workSessions: [closed, running] })

    const [totals] = todaysSettledTotals([ada], DAY_START)

    expect(totals).toMatchObject({ deepFocusMs: 30 * M, totalMs: 1 * H })
  })

  it('counts a closed session that straddled midnight only from the Day start', () => {
    const start = DAY_START - 30 * M
    const ada = member({
      workSessions: [
        workSession([partial({ mode: 'camera', startedAt: start, endedAt: start + 1 * H })], {
          status: 'ended',
          startedAt: start,
          endedAt: start + 1 * H,
        }),
      ],
    })

    const [totals] = todaysSettledTotals([ada], DAY_START)

    expect(totals).toMatchObject({ deepFocusMs: 30 * M, totalMs: 30 * M })
  })
})

describe('liveTailFor', () => {
  it('clamps a running session and Deep focus partial to the Day start', () => {
    const start = DAY_START - 30 * M
    const ada = member({
      workSessions: [
        workSession([partial({ mode: 'camera', startedAt: start, endedAt: null })], {
          status: 'active',
          startedAt: start,
          endedAt: null,
        }),
      ],
    })

    expect(liveTailFor(ada, DAY_START)).toEqual({
      deepFocusSince: DAY_START,
      spanSince: DAY_START,
    })
  })

  it('keeps the Total span but not Deep focus for a running break', () => {
    const start = DAY_START + 1 * H
    const ada = member({
      workSessions: [
        workSession([partial({ mode: 'break', startedAt: start, endedAt: null })], {
          status: 'active',
          startedAt: start,
          endedAt: null,
        }),
      ],
    })

    expect(liveTailFor(ada, DAY_START)).toEqual({
      deepFocusSince: null,
      spanSince: start,
    })
  })

  it('has no tail once everything is closed', () => {
    const start = DAY_START + 1 * H
    const ada = member({
      workSessions: [
        workSession([partial({ mode: 'camera', startedAt: start, endedAt: start + 30 * M })], {
          status: 'ended',
          startedAt: start,
          endedAt: start + 30 * M,
        }),
      ],
    })

    expect(liveTailFor(ada, DAY_START)).toEqual({
      deepFocusSince: null,
      spanSince: null,
    })
  })
})

describe('rankTotals', () => {
  it('ranks by Deep focus, then Total time, then id', () => {
    const ada = row({ discordId: 'ada', deepFocusMs: 30 * M, totalMs: 3 * H })
    const bob = row({ discordId: 'bob', deepFocusMs: 30 * M, totalMs: 2 * H })
    const cara = row({ discordId: 'cara', deepFocusMs: 10 * M, totalMs: 5 * H })

    expect(rankTotals([cara, bob, ada]).map((r) => r.discordId)).toEqual(['ada', 'bob', 'cara'])
  })

  it('caps the board at ten rows', () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      row({ discordId: `member-${i}`, deepFocusMs: (i + 1) * M })
    )
    const ranked = rankTotals(rows)
    expect(ranked).toHaveLength(MAX_LEADERBOARD_ROWS)
    expect(ranked[0].discordId).toBe('member-11')
  })
})

describe('buildTableRows', () => {
  it('keeps every member with time in any period, not just a top ten', () => {
    const week = Array.from({ length: 12 }, (_, i) =>
      total({
        discordId: `member-${i}`,
        deepFocusMs: (20 - i) * M,
        totalMs: (20 - i) * M,
      })
    )
    const ada = total({ discordId: 'ada', deepFocusMs: 5 * M, totalMs: 5 * M })
    const day = [total({ discordId: 'ada', deepFocusMs: 30 * M, totalMs: 30 * M })]

    const table = buildTableRows({ day, week: [...week, ada], month: [...week, ada] }, new Map())
    const adaRow = table.find((r) => r.discordId === 'ada')

    expect(table).toHaveLength(13)
    expect(adaRow).toMatchObject({
      day: { deepFocusMs: 30 * M, totalMs: 30 * M },
      week: { deepFocusMs: 5 * M, totalMs: 5 * M },
      live: { deepFocusSince: null, spanSince: null },
    })
  })

  it('attaches the live tail by member key', () => {
    const live = { deepFocusSince: DAY_START + 1 * H, spanSince: DAY_START + 1 * H }
    const table = buildTableRows(
      { day: [total({ discordId: 'ada' })], week: [], month: [] },
      new Map([['ada', live]])
    )

    expect(table[0].live).toEqual(live)
  })
})

describe('rankLiveTableRows', () => {
  it('adds live minutes to every period that contains today, then ranks the group', () => {
    const now = DAY_START + 2 * H
    const ada = tableRow({
      discordId: 'ada',
      live: { deepFocusSince: DAY_START + 1 * H, spanSince: DAY_START + 1 * H },
    })
    const bob = tableRow({
      discordId: 'bob',
      day: { deepFocusMs: 90 * M, totalMs: 90 * M },
      week: { deepFocusMs: 90 * M, totalMs: 90 * M },
      month: { deepFocusMs: 90 * M, totalMs: 90 * M },
    })

    const ranked = rankLiveTableRows([ada, bob], DAY_START, now)
    const adaRow = ranked.find((row) => row.discordId === 'ada')
    const bobRow = ranked.find((row) => row.discordId === 'bob')

    expect(adaRow).toMatchObject({
      day: { deepFocusMs: 1 * H, totalMs: 1 * H, deepFocusRank: 2, totalRank: 2 },
      week: { deepFocusMs: 1 * H, totalMs: 1 * H, deepFocusRank: 2, totalRank: 2 },
      month: { deepFocusMs: 1 * H, totalMs: 1 * H, deepFocusRank: 2, totalRank: 2 },
    })
    expect(bobRow).toMatchObject({
      day: { deepFocusMs: 90 * M, deepFocusRank: 1 },
    })
  })

  it('leaves the rank null when the member has no time in that period', () => {
    const row = tableRow({
      week: { deepFocusMs: 30 * M, totalMs: 30 * M },
      month: { deepFocusMs: 30 * M, totalMs: 30 * M },
    })

    const [ranked] = rankLiveTableRows([row], DAY_START, DAY_START + 1 * H)

    expect(ranked.day).toEqual({
      deepFocusMs: 0,
      totalMs: 0,
      deepFocusRank: null,
      totalRank: null,
    })
    expect(ranked.week.deepFocusRank).toBe(1)
  })

  it('does not add today’s live tail to a past Day', () => {
    const yesterday = DAY_START - 24 * H
    const row = tableRow({
      day: { deepFocusMs: 30 * M, totalMs: 30 * M },
      live: { deepFocusSince: DAY_START + 1 * H, spanSince: DAY_START + 1 * H },
    })

    const [ranked] = rankLiveTableRows([row], yesterday, DAY_START + 2 * H)

    expect(ranked.day).toMatchObject({ deepFocusMs: 30 * M, totalMs: 30 * M })
  })
})
