import { describe, expect, it } from 'vitest'
import type { Id } from '../_generated/dataModel'
import type { DashboardMember, DashboardPartial, DashboardSession } from '../sessions/types'
import { formatClock, resolveWindow, toMinute, toTimelineRows } from './util'

const DAY = Date.UTC(2026, 9, 14)
const MIN = 60_000
const at = (minutes: number) => DAY + minutes * MIN

const partial = (
  mode: DashboardPartial['mode'],
  fromMin: number,
  toMin: number | null
): DashboardPartial => ({
  id: 'p' as Id<'sessionPartial'>,
  channelId: mode === 'break' ? null : 'study-1',
  mode,
  startedAt: at(fromMin),
  endedAt: toMin === null ? null : at(toMin),
})

const session = (
  partials: DashboardPartial[],
  tasks: { title: string; atMin: number }[] = []
): DashboardSession => ({
  id: 's' as Id<'session'>,
  status: partials.some((p) => p.endedAt === null) ? 'active' : 'ended',
  startedAt: partials[0]?.startedAt ?? DAY,
  endedAt: partials[partials.length - 1]?.endedAt ?? null,
  partials,
  tasks: tasks.map((t, i) => ({
    id: `t${i}` as Id<'task'>,
    title: t.title,
    completedAt: at(t.atMin),
  })),
})

const member = (
  i: number,
  name: string | null,
  sessions: DashboardSession[],
  { image = null, userId = `user-${i}` }: { image?: string | null; userId?: string | null } = {}
): DashboardMember => ({
  userId: (userId === null ? null : userId) as Id<'users'>,
  discordId: String(1000 + i),
  name,
  image,
  online: sessions.some((s) => s.status === 'active'),
  sessions,
})

const window = resolveWindow({ nowMin: 15 * 60, availablePx: 1440 })
const input = (over: Partial<Parameters<typeof toTimelineRows>[1]> = {}) => ({
  now: at(15 * 60),
  dayStart: DAY,
  me: 'user-0',
  window,
  ...over,
})

describe('resolveWindow', () => {
  it('renders a single full-scale core across the whole day', () => {
    const w = resolveWindow({ nowMin: 0, availablePx: 1440 })
    expect(w.segments).toEqual([{ kind: 'core', startMin: 0, endMin: 1440, widthPx: 1440 }])
    expect(w.widthPx).toBe(1440)
    expect(w.overflow).toBe(false)
  })

  it('labels the axis at every two hours, both ends included', () => {
    const w = resolveWindow({ nowMin: 0, availablePx: 1440 })
    expect(w.ticks[0]).toEqual({ leftPx: 0, label: '00:00' })
    expect(w.ticks.at(-1)).toEqual({ leftPx: 1440, label: '24:00' })
    expect(w.ticks).toHaveLength(13)
  })

  it('places now on the axis', () => {
    const w = resolveWindow({ nowMin: 15 * 60, availablePx: 1440 })
    expect(w.nowPx).toBe(900)
  })
})

describe('toTimelineRows', () => {
  it('is empty for an empty room', () => {
    expect(toTimelineRows([], input())).toEqual([])
  })

  it('maps one member per row, you first', () => {
    const members = Array.from({ length: 13 }, (_, i) =>
      member(i + 1, `M${i}`, [session([partial('camera', 600 + i, null)])])
    )
    members.push(member(0, 'Me', [session([partial('camera', 60, null)])]))
    const rows = toTimelineRows(members, input())
    expect(rows).toHaveLength(13 + 1)
    expect(rows[0].you).toBe(true)
    expect(rows[0].name).toBe('Me')
  })

  it('falls back to discordId when a member is unlinked', () => {
    const rows = toTimelineRows(
      [member(99, null, [session([partial('voice', 300, null)])], { userId: null })],
      input({ me: null })
    )
    expect(rows[0].name).toBe('1099')
    expect(rows[0].image).toBeNull()
    expect(rows[0].you).toBe(false)
  })

  it('positions bars and dots as axis pixels, not timestamps', () => {
    const rows = toTimelineRows(
      [member(0, 'Me', [session([partial('camera', 300, 360)], [{ title: 'Read', atMin: 330 }])])],
      input()
    )
    expect(rows[0].bars).toEqual([{ leftPx: 300, widthPx: 60, mode: 'camera', live: false }])
    expect(rows[0].dots).toEqual([{ leftPx: 330 }])
  })

  it('marks a running partial live and extends it to now', () => {
    const rows = toTimelineRows(
      [member(0, 'Me', [session([partial('screenShare', 840, null)])])],
      input({ now: at(15 * 60) })
    )
    expect(rows[0].bars[0]).toEqual({
      leftPx: 840,
      widthPx: 60,
      mode: 'screenShare',
      live: true,
    })
  })
})

describe('clock helpers', () => {
  it('formats minutes-of-day', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(1110)).toBe('18:30')
    expect(formatClock(1440)).toBe('24:00')
  })

  it('derives minutes from an instant and the day start', () => {
    expect(toMinute(at(90), DAY)).toBe(90)
  })
})
