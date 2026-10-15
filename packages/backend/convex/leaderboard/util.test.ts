import { describe, expect, it } from 'vitest'
import type { Id } from '../_generated/dataModel'
import type { DashboardMember, DashboardPartial, DashboardSession } from '../sessions/types'
import type { LeaderboardRow } from './types'
import { MAX_LEADERBOARD_ROWS, rankTotals, todaysTotals } from './util'

const M = 60 * 1000
const H = 60 * 60 * 1000

// 2026-06-15 12:00 Zurich (UTC+2). Local midnight is 2026-06-14 22:00 UTC.
const DAY_START = Date.UTC(2026, 5, 14, 22, 0, 0)

function partial(overrides: Partial<DashboardPartial> = {}): DashboardPartial {
  return {
    id: 'p1' as Id<'sessionPartial'>,
    channelId: 'chan-a',
    mode: 'voice',
    startedAt: 0,
    endedAt: null,
    ...overrides,
  }
}

function session(partials: DashboardPartial[], overrides: Partial<DashboardSession> = {}) {
  return {
    id: 's1' as Id<'session'>,
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
    sessions: [],
    ...overrides,
  }
}

function row(overrides: Partial<LeaderboardRow> = {}): LeaderboardRow {
  return {
    discordId: 'd1',
    name: 'Ada',
    deepFocusMs: 0,
    totalMs: 0,
    online: false,
    ...overrides,
  }
}

describe('todaysTotals', () => {
  it('counts camera time as Deep focus and the span as Total time', () => {
    const ada = member({
      discordId: 'ada',
      name: 'Ada',
      online: true,
      sessions: [
        session([partial({ mode: 'camera', startedAt: 0, endedAt: 30 * M })], {
          startedAt: 0,
          endedAt: 1 * H,
        }),
      ],
    })
    const [totals] = todaysTotals([ada], 0, 2 * H)
    expect(totals).toMatchObject({ discordId: 'ada', deepFocusMs: 30 * M, totalMs: 1 * H })
  })

  it('clips a session that straddled midnight to the Day', () => {
    const start = DAY_START - 30 * M
    const ada = member({
      discordId: 'ada',
      sessions: [
        session([partial({ mode: 'camera', startedAt: start, endedAt: null })], {
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
      sessions: [
        session([partial({ mode: 'camera', startedAt: 0, endedAt: 2 * H })], {
          startedAt: 0,
          endedAt: 2 * H,
        }),
      ],
    })
    const [totals] = todaysTotals([ada], 0, 1 * H)
    expect(totals).toMatchObject({ deepFocusMs: 1 * H, totalMs: 1 * H })
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
