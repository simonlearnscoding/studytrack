import { describe, expect, it } from 'vitest'
import type { Id } from '../_generated/dataModel'
import type {
  DashboardMember,
  DashboardPartial,
  DashboardSession,
  DashboardSessionTask,
  SessionTaskSource,
} from './types'
import {
  DASHBOARD_TIME_ZONE,
  attachTasksToSessions,
  formatDuration,
  formatDurationClock,
  formatDurationHM,
  memberTotalMs,
  nextDayStart,
  nextMonthStart,
  nextWeekStart,
  partialDurationMs,
  previousDayStart,
  sessionContainsCompletedAt,
  sessionStudyMs,
  sortMembers,
  startOfDay,
  startOfMonth,
  startOfWeek,
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
    tasks: [] as DashboardSessionTask[],
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
    plan: null,
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
  it('puts the most studied first', () => {
    const least = member({
      discordId: 'least',
      online: true,
      sessions: [session([partial({ startedAt: 0, endedAt: 5 * M })])],
    })
    const most = member({
      discordId: 'most',
      sessions: [session([partial({ startedAt: 0, endedAt: 3 * H })])],
    })
    const middle = member({
      discordId: 'middle',
      sessions: [session([partial({ startedAt: 0, endedAt: 1 * H })])],
    })

    const sorted = sortMembers([least, most, middle], 3 * H)
    expect(sorted.map((m) => m.discordId)).toEqual(['most', 'middle', 'least'])
  })
})

describe('sessionContainsCompletedAt', () => {
  const ended = session([], { startedAt: 1 * H, endedAt: 2 * H })

  it('accepts a completion inside the span', () => {
    expect(sessionContainsCompletedAt(ended, 90 * M)).toBe(true)
  })

  it('accepts the instant the session starts but not the instant it ends', () => {
    expect(sessionContainsCompletedAt(ended, 1 * H)).toBe(true)
    expect(sessionContainsCompletedAt(ended, 2 * H)).toBe(false)
  })

  it('treats a running session as open-ended', () => {
    const running = session([], { status: 'active', startedAt: 1 * H, endedAt: null })
    expect(sessionContainsCompletedAt(running, 5 * H)).toBe(true)
    expect(sessionContainsCompletedAt(running, 30 * M)).toBe(false)
  })
})

describe('attachTasksToSessions', () => {
  function task(overrides: Partial<SessionTaskSource> = {}): SessionTaskSource {
    return {
      id: 't1' as Id<'task'>,
      title: 'Read a chapter',
      createdAt: 0,
      plannedSessionId: null,
      completedAt: null,
      ...overrides,
    }
  }

  const sessions = [
    session([], { id: 's1' as Id<'session'>, startedAt: 1 * H, endedAt: 2 * H }),
    session([], { id: 's2' as Id<'session'>, startedAt: 3 * H, endedAt: 4 * H }),
  ]

  it('shows a planned-only task as planned with no completion instant', () => {
    const tasks = [task({ plannedSessionId: 's1' as Id<'session'> })]

    const bound = attachTasksToSessions(sessions, tasks)
    expect(bound[0].tasks).toEqual([
      { id: 't1' as Id<'task'>, title: 'Read a chapter', planned: true, completedAt: null },
    ])
    expect(bound[1].tasks).toEqual([])
  })

  it('binds a finished task to the session whose span contains its completion', () => {
    const tasks = [
      task({ id: 't1' as Id<'task'>, title: 'First', completedAt: 90 * M }),
      task({ id: 't2' as Id<'task'>, title: 'Second', completedAt: 3 * H + 10 * M }),
      task({ id: 't3' as Id<'task'>, title: 'In the gap', completedAt: 2 * H + 30 * M }),
    ]

    const bound = attachTasksToSessions(sessions, tasks)
    expect(bound[0].tasks.map((t) => t.title)).toEqual(['First'])
    expect(bound[1].tasks.map((t) => t.title)).toEqual(['Second'])
  })

  it('shows a task planned and finished in the same session once, with both states', () => {
    const tasks = [task({ plannedSessionId: 's1' as Id<'session'>, completedAt: 90 * M })]

    const bound = attachTasksToSessions(sessions, tasks)
    expect(bound[0].tasks).toHaveLength(1)
    expect(bound[0].tasks[0]).toMatchObject({ planned: true, completedAt: 90 * M })
  })

  it('shows a task planned in one session and finished in another in both', () => {
    const tasks = [task({ plannedSessionId: 's1' as Id<'session'>, completedAt: 3 * H + 10 * M })]

    const bound = attachTasksToSessions(sessions, tasks)
    expect(bound[0].tasks).toEqual([
      { id: 't1' as Id<'task'>, title: 'Read a chapter', planned: true, completedAt: null },
    ])
    expect(bound[1].tasks).toEqual([
      {
        id: 't1' as Id<'task'>,
        title: 'Read a chapter',
        planned: false,
        completedAt: 3 * H + 10 * M,
      },
    ])
  })

  it('drops a completion that falls in a gap between sessions', () => {
    const tasks = [task({ completedAt: 2 * H + 30 * M })]

    const bound = attachTasksToSessions(sessions, tasks)
    expect(bound[0].tasks).toEqual([])
    expect(bound[1].tasks).toEqual([])
  })

  it('keeps a reopened planned task as planned-only', () => {
    const tasks = [task({ plannedSessionId: 's1' as Id<'session'>, completedAt: null })]

    const bound = attachTasksToSessions(sessions, tasks)
    expect(bound[0].tasks[0]).toMatchObject({ planned: true, completedAt: null })
  })

  it('orders planned entries by creation, then finished-only entries by completion', () => {
    const tasks = [
      task({
        id: 't1' as Id<'task'>,
        title: 'Planned first',
        createdAt: 1,
        plannedSessionId: 's1' as Id<'session'>,
      }),
      task({
        id: 't2' as Id<'task'>,
        title: 'Planned second',
        createdAt: 2,
        plannedSessionId: 's1' as Id<'session'>,
      }),
      task({ id: 't3' as Id<'task'>, title: 'Finished later', completedAt: 110 * M }),
      task({ id: 't4' as Id<'task'>, title: 'Finished earlier', completedAt: 70 * M }),
    ]

    const bound = attachTasksToSessions(sessions, tasks)
    expect(bound[0].tasks.map((t) => t.title)).toEqual([
      'Planned first',
      'Planned second',
      'Finished earlier',
      'Finished later',
    ])
  })
})

describe('formatDuration', () => {
  it('formats hours, minutes and seconds', () => {
    expect(formatDuration(3 * H + 30 * M + 5 * 1000)).toBe('3h30m05s')
  })

  it('drops hours when under an hour, keeping seconds', () => {
    expect(formatDuration(45 * M + 12 * 1000)).toBe('45m12s')
  })

  it('shows bare seconds under a minute, and zero as 0s', () => {
    expect(formatDuration(5 * 1000)).toBe('5s')
    expect(formatDuration(0)).toBe('0s')
  })
})

describe('formatDurationHM', () => {
  it('formats hours and minutes, dropping seconds', () => {
    expect(formatDurationHM(3 * H + 30 * M + 5 * 1000)).toBe('3h30m')
  })

  it('drops hours when under an hour', () => {
    expect(formatDurationHM(45 * M + 12 * 1000)).toBe('45m')
  })

  it('rounds down partial minutes, and zero as 0m', () => {
    expect(formatDurationHM(5 * 1000)).toBe('0m')
    expect(formatDurationHM(0)).toBe('0m')
  })
})

describe('formatDurationClock', () => {
  it('formats hours, minutes and seconds as HH:MM:SS', () => {
    expect(formatDurationClock(3 * H + 30 * M + 5 * 1000)).toBe('03:30:05')
  })

  it('keeps both digits under an hour', () => {
    expect(formatDurationClock(45 * M + 12 * 1000)).toBe('00:45:12')
  })

  it('shows zero as 00:00:00', () => {
    expect(formatDurationClock(0)).toBe('00:00:00')
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

describe('nextDayStart / previousDayStart', () => {
  it('walks to the neighbouring midnights on an ordinary day', () => {
    const day = startOfDay(Date.UTC(2026, 5, 15, 10, 0, 0), DASHBOARD_TIME_ZONE)
    expect(day).toBe(Date.UTC(2026, 5, 14, 22, 0, 0))
    expect(nextDayStart(day, DASHBOARD_TIME_ZONE)).toBe(Date.UTC(2026, 5, 15, 22, 0, 0))
    expect(previousDayStart(day, DASHBOARD_TIME_ZONE)).toBe(Date.UTC(2026, 5, 13, 22, 0, 0))
  })

  it('handles the 23-hour spring-forward day (2026-03-29)', () => {
    const day = startOfDay(Date.UTC(2026, 2, 29, 12, 0, 0), DASHBOARD_TIME_ZONE)
    const next = nextDayStart(day, DASHBOARD_TIME_ZONE)
    expect(next - day).toBe(23 * H)
    expect(previousDayStart(next, DASHBOARD_TIME_ZONE)).toBe(day)
  })

  it('handles the 25-hour fall-back day (2026-10-25)', () => {
    const day = startOfDay(Date.UTC(2026, 9, 25, 12, 0, 0), DASHBOARD_TIME_ZONE)
    const next = nextDayStart(day, DASHBOARD_TIME_ZONE)
    expect(next - day).toBe(25 * H)
    expect(previousDayStart(next, DASHBOARD_TIME_ZONE)).toBe(day)
  })
})

describe('startOfWeek', () => {
  it('returns the Monday midnight of the Week', () => {
    // Wednesday 2026-06-17 12:00 Zurich still belongs to the Week of Mon 15 June.
    const now = Date.UTC(2026, 5, 17, 10, 0, 0)
    expect(startOfWeek(now, DASHBOARD_TIME_ZONE)).toBe(Date.UTC(2026, 5, 14, 22, 0, 0))
  })

  it('is a no-op on a Monday', () => {
    const now = Date.UTC(2026, 5, 15, 10, 0, 0)
    expect(startOfWeek(now, DASHBOARD_TIME_ZONE)).toBe(Date.UTC(2026, 5, 14, 22, 0, 0))
  })

  it('crosses a DST change without drifting', () => {
    // Sunday 2026-03-29 belongs to the Week starting Mon 23 March (winter, UTC+1).
    const week = startOfWeek(Date.UTC(2026, 2, 29, 10, 0, 0), DASHBOARD_TIME_ZONE)
    expect(week).toBe(Date.UTC(2026, 2, 22, 23, 0, 0))
    // The next Monday is 2026-03-30, after the spring-forward change.
    const nextWeek = startOfWeek(Date.UTC(2026, 2, 30, 10, 0, 0), DASHBOARD_TIME_ZONE)
    expect(nextWeek).toBe(Date.UTC(2026, 2, 29, 22, 0, 0))
    // Seven calendar days, one of them an hour short.
    expect(nextWeek - week).toBe(7 * 24 * H - H)
  })
})

describe('startOfMonth', () => {
  it('returns 00:00 on the 1st', () => {
    const now = Date.UTC(2026, 5, 15, 10, 0, 0)
    expect(startOfMonth(now, DASHBOARD_TIME_ZONE)).toBe(Date.UTC(2026, 4, 31, 22, 0, 0))
  })

  it('resolves the 1st across the fall-back change', () => {
    const now = Date.UTC(2026, 9, 25, 10, 0, 0)
    expect(startOfMonth(now, DASHBOARD_TIME_ZONE)).toBe(Date.UTC(2026, 8, 30, 22, 0, 0))
  })
})

describe('nextWeekStart', () => {
  it('is the Monday midnight seven days later', () => {
    const week = startOfWeek(Date.UTC(2026, 5, 17, 10, 0, 0), DASHBOARD_TIME_ZONE)
    expect(week).toBe(Date.UTC(2026, 5, 14, 22, 0, 0))
    expect(nextWeekStart(week, DASHBOARD_TIME_ZONE)).toBe(Date.UTC(2026, 5, 21, 22, 0, 0))
  })

  it('crosses the spring-forward change without drifting', () => {
    const week = startOfWeek(Date.UTC(2026, 2, 23, 10, 0, 0), DASHBOARD_TIME_ZONE)
    expect(week).toBe(Date.UTC(2026, 2, 22, 23, 0, 0))
    const next = nextWeekStart(week, DASHBOARD_TIME_ZONE)
    expect(next).toBe(Date.UTC(2026, 2, 29, 22, 0, 0))
    expect(next - week).toBe(7 * 24 * H - H)
  })
})

describe('nextMonthStart', () => {
  it('is the 1st of the next Month', () => {
    const month = startOfMonth(Date.UTC(2026, 5, 15, 10, 0, 0), DASHBOARD_TIME_ZONE)
    expect(month).toBe(Date.UTC(2026, 4, 31, 22, 0, 0))
    expect(nextMonthStart(month, DASHBOARD_TIME_ZONE)).toBe(Date.UTC(2026, 5, 30, 22, 0, 0))
  })

  it('rolls over the year boundary', () => {
    const month = startOfMonth(Date.UTC(2026, 11, 10, 10, 0, 0), DASHBOARD_TIME_ZONE)
    expect(nextMonthStart(month, DASHBOARD_TIME_ZONE)).toBe(Date.UTC(2026, 11, 31, 23, 0, 0))
  })
})
