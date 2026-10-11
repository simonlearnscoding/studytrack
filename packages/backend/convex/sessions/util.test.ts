import { describe, expect, it } from 'vitest'
import type { Id } from '../_generated/dataModel'
import type { DashboardMember, DashboardPartial, DashboardSession } from './types'
import {
  DASHBOARD_TIME_ZONE,
  formatDuration,
  memberTotalMs,
  partialDurationMs,
  sessionStudyMs,
  sortMembers,
  startOfDay,
} from './util'

const M = 60 * 1000
const H = 60 * 60 * 1000

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

describe('partialDurationMs', () => {
  it('is fixed once ended', () => {
    expect(partialDurationMs(partial({ startedAt: 0, endedAt: 30 * M }), H)).toBe(30 * M)
  })

  it('is live while running', () => {
    expect(partialDurationMs(partial({ startedAt: 0, endedAt: null }), 30 * M)).toBe(30 * M)
  })

  it('never goes negative', () => {
    expect(partialDurationMs(partial({ startedAt: 30 * M, endedAt: null }), 0)).toBe(0)
  })
})

describe('sessionStudyMs', () => {
  it('sums partials but skips breaks', () => {
    const value = sessionStudyMs(
      session([
        partial({ startedAt: 0, endedAt: 1 * H }),
        partial({ mode: 'break', startedAt: 1 * H, endedAt: 1 * H + 10 * M }),
        partial({ mode: 'camera', startedAt: 1 * H + 10 * M, endedAt: 1 * H + 30 * M }),
      ]),
      H
    )
    expect(value).toBe(80 * M)
  })

  it('counts a running partial up to now', () => {
    expect(sessionStudyMs(session([partial({ startedAt: 0, endedAt: null })]), 20 * M)).toBe(20 * M)
  })
})

describe('memberTotalMs', () => {
  it('sums every session today', () => {
    const m = member({
      sessions: [
        session([partial({ startedAt: 0, endedAt: 1 * H })]),
        session([partial({ startedAt: 2 * H, endedAt: 2 * H + 30 * M })]),
      ],
    })
    expect(memberTotalMs(m, 3 * H)).toBe(90 * M)
  })
})

describe('sortMembers', () => {
  it('puts online first, then by total time', () => {
    const offlineBig = member({
      discordId: 'off-big',
      sessions: [session([partial({ startedAt: 0, endedAt: 3 * H })])],
    })
    const offlineSmall = member({
      discordId: 'off-small',
      sessions: [session([partial({ startedAt: 0, endedAt: 1 * H })])],
    })
    const onlineSmall = member({
      discordId: 'on-small',
      online: true,
      sessions: [session([partial({ startedAt: 0, endedAt: 5 * M })])],
    })

    const sorted = sortMembers([offlineSmall, offlineBig, onlineSmall], 3 * H)
    expect(sorted.map((m) => m.discordId)).toEqual(['on-small', 'off-big', 'off-small'])
  })
})

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(3 * H + 30 * M)).toBe('3h30m')
  })

  it('drops the hours when under an hour', () => {
    expect(formatDuration(45 * M)).toBe('45m')
    expect(formatDuration(0)).toBe('0m')
  })
})

describe('startOfDay', () => {
  it('resolves local midnight in summer (UTC+2)', () => {
    const now = Date.UTC(2026, 5, 15, 10, 0, 0) // 12:00 Zurich
    expect(startOfDay(now, DASHBOARD_TIME_ZONE)).toBe(Date.UTC(2026, 5, 14, 22, 0, 0))
  })

  it('resolves local midnight in winter (UTC+1)', () => {
    const now = Date.UTC(2026, 0, 15, 11, 0, 0) // 12:00 Zurich
    expect(startOfDay(now, DASHBOARD_TIME_ZONE)).toBe(Date.UTC(2026, 0, 14, 23, 0, 0))
  })
})
