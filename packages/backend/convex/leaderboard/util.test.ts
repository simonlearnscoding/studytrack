import { describe, expect, it } from 'vitest'
import type { Id } from '../_generated/dataModel'
import type { DashboardMember, DashboardPartial, DashboardSession } from '../sessions/types'
import { MAX_LEADERBOARD_ROWS, memberDeepFocusMs, memberSpanMs, rankMembers } from './util'

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

describe('memberDeepFocusMs', () => {
  it('counts only camera and camera-and-screen-share time', () => {
    const value = memberDeepFocusMs(
      member({
        sessions: [
          session([
            partial({ mode: 'voice', startedAt: 0, endedAt: 1 * H }),
            partial({ mode: 'camera', startedAt: 1 * H, endedAt: 1 * H + 30 * M }),
            partial({ mode: 'screenShare', startedAt: 1 * H + 30 * M, endedAt: 2 * H }),
            partial({ mode: 'cameraAndScreenShare', startedAt: 2 * H, endedAt: 2 * H + 20 * M }),
          ]),
        ],
      }),
      3 * H
    )
    expect(value).toBe(50 * M)
  })

  it('counts a running camera partial up to now', () => {
    const value = memberDeepFocusMs(
      member({ sessions: [session([partial({ mode: 'camera', startedAt: 0, endedAt: null })])] }),
      15 * M
    )
    expect(value).toBe(15 * M)
  })
})

describe('memberSpanMs', () => {
  it('uses the session span, so Pauses are included', () => {
    const value = memberSpanMs(
      member({
        sessions: [
          session([partial({ startedAt: 0, endedAt: 1 * H })], {
            startedAt: 0,
            endedAt: 2 * H,
          }),
        ],
      }),
      3 * H
    )
    expect(value).toBe(2 * H)
  })
})

describe('rankMembers', () => {
  it('ranks by Deep focus and carries the other numbers', () => {
    const ada = member({
      discordId: 'ada',
      name: 'Ada',
      online: true,
      sessions: [
        session([partial({ mode: 'camera', startedAt: 0, endedAt: 30 * M })], {
          startedAt: 0,
          endedAt: 1 * H,
        }),
        session([partial({ mode: 'voice', startedAt: 1 * H, endedAt: 2 * H })], {
          startedAt: 1 * H,
          endedAt: 2 * H,
        }),
      ],
    })
    const bob = member({
      discordId: 'bob',
      name: 'Bob',
      sessions: [
        session([partial({ mode: 'voice', startedAt: 0, endedAt: 2 * H })], {
          startedAt: 0,
          endedAt: 2 * H,
        }),
      ],
    })

    const rows = rankMembers([bob, ada], 3 * H)
    expect(rows.map((r) => r.discordId)).toEqual(['ada', 'bob'])
    expect(rows[0]).toMatchObject({
      name: 'Ada',
      deepFocusMs: 30 * M,
      totalMs: 2 * H,
      online: true,
    })
    expect(rows[1]).toMatchObject({ deepFocusMs: 0, totalMs: 2 * H, online: false })
  })

  it('caps the board at ten rows', () => {
    const members = Array.from({ length: 12 }, (_, i) =>
      member({
        discordId: `member-${i}`,
        sessions: [
          session([partial({ startedAt: 0, endedAt: (i + 1) * M })], {
            startedAt: 0,
            endedAt: (i + 1) * M,
          }),
        ],
      })
    )
    const rows = rankMembers(members, H)
    expect(rows).toHaveLength(MAX_LEADERBOARD_ROWS)
    expect(rows[0].discordId).toBe('member-11')
  })
})
