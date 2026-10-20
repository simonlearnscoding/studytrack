import type { Id } from '../_generated/dataModel'
import type { DashboardMember, DashboardPartial, DashboardSession } from './types'
import { describe, expect, it } from 'vitest'
import {
  collectiveFocusMs,
  focusRate,
  formatCompactMs,
  memberFocusMs,
  memberSpanTotalMs,
  sessionSpanMs,
} from './metrics'

const M = 60_000
const H = 60 * M
const NOW = Date.UTC(2026, 5, 15, 12, 0, 0)

function partial(overrides: Partial<DashboardPartial> = {}): DashboardPartial {
  return {
    id: 'partial-1' as Id<'sessionPartial'>,
    channelId: 'channel-1',
    mode: 'voice',
    startedAt: NOW - 10 * M,
    endedAt: NOW,
    ...overrides,
  }
}

function session(
  partials: DashboardPartial[] = [],
  overrides: Partial<DashboardSession> = {}
): DashboardSession {
  return {
    id: 'session-1' as Id<'session'>,
    status: 'ended',
    startedAt: NOW - H,
    endedAt: NOW,
    partials,
    tasks: [],
    ...overrides,
  }
}

function member(overrides: Partial<DashboardMember> = {}): DashboardMember {
  return {
    userId: 'user-1' as Id<'users'>,
    discordId: 'ada',
    name: 'Ada',
    image: null,
    online: false,
    sessions: [],
    plans: [],
    activeTask: null,
    ...overrides,
  }
}

describe('sessionSpanMs', () => {
  it('is the whole span of an ended session', () => {
    expect(sessionSpanMs(session([], { startedAt: NOW - 2 * H, endedAt: NOW - H }), NOW)).toBe(H)
  })

  it('stays live while the session is active', () => {
    expect(
      sessionSpanMs(session([], { status: 'active', startedAt: NOW - 30 * M, endedAt: null }), NOW)
    ).toBe(30 * M)
  })

  it('never goes negative', () => {
    expect(sessionSpanMs(session([], { startedAt: NOW + M, endedAt: null }), NOW)).toBe(0)
  })
})

describe('memberSpanTotalMs', () => {
  it('sums spans across sessions, pauses included by construction', () => {
    const mine = member({
      sessions: [
        session([], { startedAt: NOW - 3 * H, endedAt: NOW - 2 * H }),
        session([], { startedAt: NOW - H, endedAt: NOW - 30 * M }),
      ],
    })
    expect(memberSpanTotalMs(mine, NOW)).toBe(H + 30 * M)
  })

  it('is zero for a member with no sessions', () => {
    expect(memberSpanTotalMs(member(), NOW)).toBe(0)
  })
})

describe('memberFocusMs', () => {
  it('counts camera and screen share modes only', () => {
    const mine = member({
      sessions: [
        session([
          partial({ mode: 'camera' }),
          partial({ mode: 'screenShare' }),
          partial({ mode: 'cameraAndScreenShare' }),
          partial({ mode: 'voice' }),
          partial({ mode: 'break', channelId: null }),
          partial({ mode: 'manual', channelId: null }),
        ]),
      ],
    })
    expect(memberFocusMs(mine, NOW)).toBe(3 * 10 * M)
  })

  it('counts a live focus partial up to now', () => {
    const mine = member({
      sessions: [
        session([partial({ mode: 'screenShare', startedAt: NOW - 12 * M, endedAt: null })], {
          status: 'active',
          endedAt: null,
        }),
      ],
    })
    expect(memberFocusMs(mine, NOW)).toBe(12 * M)
  })
})

describe('collectiveFocusMs', () => {
  function inRoom(id: string, partials: DashboardPartial[]): DashboardMember {
    return member({
      discordId: id,
      online: true,
      sessions: [session(partials, { status: 'active', endedAt: null })],
    })
  }

  it('is zero for an empty room', () => {
    expect(collectiveFocusMs([], NOW, 'focus')).toBe(0)
  })

  it('adds a second per person per second — three focusers read 3h', () => {
    const room = [
      inRoom('ada', [partial({ mode: 'camera', startedAt: NOW - H, endedAt: null })]),
      inRoom('bob', [partial({ mode: 'screenShare', startedAt: NOW - H, endedAt: null })]),
      inRoom('cy', [partial({ mode: 'cameraAndScreenShare', startedAt: NOW - H, endedAt: null })]),
    ]
    expect(collectiveFocusMs(room, NOW, 'focus')).toBe(3 * H)
  })

  it('counts a voice-only member at nothing under Focus, their span under Total', () => {
    const room = [inRoom('ada', [partial({ mode: 'voice', startedAt: NOW - H, endedAt: null })])]
    expect(collectiveFocusMs(room, NOW, 'focus')).toBe(0)
    expect(collectiveFocusMs(room, NOW, 'total')).toBe(H)
  })

  it('ignores members with no active session', () => {
    const gone = member({
      sessions: [session([partial({ mode: 'camera' })], { status: 'ended' })],
    })
    expect(collectiveFocusMs([gone], NOW, 'focus')).toBe(0)
  })

  it('follows the metric cut across members', () => {
    const room = [
      inRoom('ada', [
        partial({ mode: 'voice', startedAt: NOW - H, endedAt: NOW - 20 * M }),
        partial({ mode: 'camera', startedAt: NOW - 20 * M, endedAt: null }),
      ]),
      inRoom('bob', [partial({ mode: 'voice', startedAt: NOW - H, endedAt: null })]),
    ]
    expect(collectiveFocusMs(room, NOW, 'focus')).toBe(20 * M)
    expect(collectiveFocusMs(room, NOW, 'total')).toBe(2 * H)
  })
})

describe('focusRate', () => {
  it('is focus over total', () => {
    expect(focusRate(30 * M, 2 * H)).toBe(0.25)
  })

  it('is null when there is no session time', () => {
    expect(focusRate(0, 0)).toBeNull()
  })
})

describe('formatCompactMs', () => {
  it('formats hours and minutes without seconds', () => {
    expect(formatCompactMs(0)).toBe('0m')
    expect(formatCompactMs(42 * M)).toBe('42m')
    expect(formatCompactMs(90 * M)).toBe('1h 30m')
    expect(formatCompactMs(H)).toBe('1h 0m')
    expect(formatCompactMs(92 * M + 59_000)).toBe('1h 32m')
  })
})
