import { describe, expect, it } from 'vitest'
import type { Id } from '../_generated/dataModel'
import type { DashboardMember, DashboardPartial, DashboardSession } from '../sessions/types'
import {
  autoExpansionAt,
  centreScrollLeft,
  formatClock,
  mergeExpansion,
  resolveWindow,
  toMinute,
  toTimelineRows,
} from './util'

const DAY = Date.UTC(2026, 9, 14)
const MIN = 60_000
const at = (minutes: number) => DAY + minutes * MIN

// 880px makes the core land exactly on the 48px/h floor: 32 + 816 + 32.
const FLOOR_PX = 880
const CORE_LEFT = 32
const PX_PER_HOUR = 48

const partial = (
  mode: DashboardPartial['mode'],
  fromMin: number,
  toMin: number | null
): DashboardPartial => ({
  id: `p-${fromMin}` as Id<'sessionPartial'>,
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

const window = resolveWindow({ nowMin: 15 * 60, availablePx: FLOOR_PX })
const input = (over: Partial<Parameters<typeof toTimelineRows>[1]> = {}) => ({
  now: at(15 * 60),
  dayStart: DAY,
  me: 'user-0',
  window,
  ...over,
})

describe('resolveWindow', () => {
  it('draws a fixed core flanked by two collapsed night bands', () => {
    const w = resolveWindow({ nowMin: 12 * 60, availablePx: FLOOR_PX })
    expect(w.segments).toHaveLength(3)
    expect(w.segments[0]).toMatchObject({ kind: 'band', side: 'morning', collapsed: true })
    expect(w.segments[1]).toMatchObject({
      kind: 'core',
      startMin: 5 * 60,
      endMin: 22 * 60,
      widthPx: 17 * PX_PER_HOUR,
    })
    expect(w.segments[2]).toMatchObject({ kind: 'band', side: 'evening', collapsed: true })
    expect(w.widthPx).toBe(FLOOR_PX)
    expect(w.overflow).toBe(false)
  })

  it('scrolls once the track falls past the 48px/h floor', () => {
    const w = resolveWindow({ nowMin: 12 * 60, availablePx: 400 })
    expect(w.segments[1]).toMatchObject({ widthPx: 17 * PX_PER_HOUR })
    expect(w.widthPx).toBeGreaterThan(400)
    expect(w.overflow).toBe(true)
  })

  it('keeps the core scale fixed when a band expands, widening the axis', () => {
    const collapsed = resolveWindow({ nowMin: 23 * 60, availablePx: FLOOR_PX })
    const expanded = resolveWindow({
      nowMin: 23 * 60,
      availablePx: FLOOR_PX,
      expansion: { morning: false, evening: true },
    })
    expect(expanded.segments[1]).toMatchObject({ widthPx: collapsed.segments[1].widthPx })
    expect(expanded.segments[2]).toMatchObject({ collapsed: false, widthPx: 2 * PX_PER_HOUR })
    expect(expanded.widthPx).toBeGreaterThan(collapsed.widthPx)
  })

  it('expands the two ends independently', () => {
    const onlyEvening = resolveWindow({
      nowMin: 0,
      availablePx: FLOOR_PX,
      expansion: { morning: false, evening: true },
    })
    expect(onlyEvening.segments[0]).toMatchObject({ side: 'morning', collapsed: true })
    expect(onlyEvening.segments[2]).toMatchObject({ side: 'evening', collapsed: false })
  })

  it('labels the core hours and thins out near the floor', () => {
    const w = resolveWindow({ nowMin: 12 * 60, availablePx: FLOOR_PX })
    expect(w.ticks[0]).toEqual({ leftPx: CORE_LEFT, label: '05:00' })
    expect(w.ticks.at(-1)).toEqual({ leftPx: CORE_LEFT + 17 * PX_PER_HOUR, label: '22:00' })
    expect(w.ticks).toHaveLength(10)
  })

  it('centres now on the core, and pins it to the boundary inside a band', () => {
    expect(resolveWindow({ nowMin: 15 * 60, availablePx: FLOOR_PX }).nowPx).toBe(
      CORE_LEFT + 10 * PX_PER_HOUR
    )
    // 03:00, morning collapsed: pinned to the morning band's inner edge.
    expect(resolveWindow({ nowMin: 3 * 60, availablePx: FLOOR_PX }).nowPx).toBe(CORE_LEFT)
    // 22:15, evening collapsed: pinned to the core's right edge.
    expect(resolveWindow({ nowMin: 22 * 60 + 15, availablePx: FLOOR_PX }).nowPx).toBe(
      CORE_LEFT + 17 * PX_PER_HOUR
    )
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
    expect(rows[0].bars).toEqual([
      { leftPx: CORE_LEFT, widthPx: PX_PER_HOUR, mode: 'camera', live: false },
    ])
    expect(rows[0].dots).toEqual([{ leftPx: CORE_LEFT + PX_PER_HOUR / 2 }])
  })

  it('marks a running partial live and extends it to now', () => {
    const rows = toTimelineRows(
      [member(0, 'Me', [session([partial('screenShare', 840, null)])])],
      input({ now: at(15 * 60) })
    )
    expect(rows[0].bars[0]).toEqual({
      leftPx: CORE_LEFT + 9 * PX_PER_HOUR,
      widthPx: PX_PER_HOUR,
      mode: 'screenShare',
      live: true,
    })
  })

  it('clips a bar at the night boundary and counts the hidden part', () => {
    const rows = toTimelineRows(
      [member(0, 'Me', [session([partial('voice', 21 * 60, 23 * 60)])])],
      input({ now: at(23 * 60) })
    )
    // 21:00–22:00 visible in the core; 22:00–23:00 hidden in the evening band.
    expect(rows[0].bars).toEqual([
      { leftPx: CORE_LEFT + 16 * PX_PER_HOUR, widthPx: PX_PER_HOUR, mode: 'voice', live: false },
    ])
    expect(rows[0].eveningHidden).toBe(1)
    expect(rows[0].morningHidden).toBe(0)
  })

  it('counts a session (not each partial) hidden in a band', () => {
    const rows = toTimelineRows(
      [
        member(0, 'Me', [
          session([
            partial('voice', 0, 60),
            partial('voice', 60, 120),
            partial('voice', 120, null),
          ]),
        ]),
      ],
      input({ now: at(3 * 60) })
    )
    expect(rows[0].morningHidden).toBe(1)
  })
})

describe('autoExpansionAt', () => {
  it('opens the morning before 05:00 and the evening at/after 22:00', () => {
    expect(autoExpansionAt(3 * 60)).toEqual({ morning: true, evening: false })
    expect(autoExpansionAt(22 * 60 + 15)).toEqual({ morning: false, evening: true })
  })

  it('leaves both collapsed inside the window, including the 05:00 boundary', () => {
    expect(autoExpansionAt(5 * 60)).toEqual({ morning: false, evening: false })
    expect(autoExpansionAt(12 * 60)).toEqual({ morning: false, evening: false })
  })
})

describe('mergeExpansion', () => {
  it('opens a band when either manual or auto asks for it', () => {
    expect(
      mergeExpansion({ morning: false, evening: false }, { morning: true, evening: false })
    ).toEqual({ morning: true, evening: false })
    expect(
      mergeExpansion({ morning: false, evening: true }, { morning: false, evening: false })
    ).toEqual({ morning: false, evening: true })
  })

  it('never lets a manual collapse close an auto-opened band', () => {
    expect(
      mergeExpansion({ morning: false, evening: false }, { morning: true, evening: true })
    ).toEqual({ morning: true, evening: true })
  })
})

describe('centreScrollLeft', () => {
  it('centres now when the track overflows', () => {
    expect(centreScrollLeft({ nowPx: 512, widthPx: 880, availablePx: 400 })).toBe(312)
  })

  it('clamps at the 00:00 end instead of showing empty space', () => {
    expect(centreScrollLeft({ nowPx: 50, widthPx: 880, availablePx: 400 })).toBe(0)
  })

  it('clamps at the 24:00 end', () => {
    expect(centreScrollLeft({ nowPx: 860, widthPx: 880, availablePx: 400 })).toBe(480)
  })

  it('does not scroll when the track fits', () => {
    expect(centreScrollLeft({ nowPx: 512, widthPx: 880, availablePx: 900 })).toBe(0)
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
