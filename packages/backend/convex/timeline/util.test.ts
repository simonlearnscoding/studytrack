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

// 608px makes the core land exactly on the 32px/h floor: 32 + 576.
const FLOOR_PX = 608
const CORE_LEFT = 32
const PX_PER_HOUR = 32

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
    planned: false,
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
  plans: [],
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
  it('draws a core running to midnight after one collapsed night band', () => {
    const w = resolveWindow({ nowMin: 12 * 60, availablePx: FLOOR_PX })
    expect(w.segments).toHaveLength(2)
    expect(w.segments[0]).toMatchObject({
      kind: 'band',
      startMin: 0,
      endMin: 6 * 60,
      collapsed: true,
      label: '0–6',
    })
    expect(w.segments[1]).toMatchObject({
      kind: 'core',
      startMin: 6 * 60,
      endMin: 24 * 60,
      widthPx: 18 * PX_PER_HOUR,
    })
    expect(w.widthPx).toBe(FLOOR_PX)
    expect(w.overflow).toBe(false)
  })

  it('scrolls once the track falls past the 32px/h floor', () => {
    const w = resolveWindow({ nowMin: 12 * 60, availablePx: 400 })
    expect(w.segments[1]).toMatchObject({ widthPx: 18 * PX_PER_HOUR })
    expect(w.widthPx).toBeGreaterThan(400)
    expect(w.overflow).toBe(true)
  })

  it('keeps the core scale fixed when the band expands, widening the axis', () => {
    const collapsed = resolveWindow({ nowMin: 12 * 60, availablePx: FLOOR_PX })
    const expanded = resolveWindow({
      nowMin: 12 * 60,
      availablePx: FLOOR_PX,
      expansion: { morning: true },
    })
    expect(expanded.segments[1]).toMatchObject({ widthPx: collapsed.segments[1].widthPx })
    expect(expanded.segments[0]).toMatchObject({ collapsed: false, widthPx: 6 * PX_PER_HOUR })
    expect(expanded.widthPx).toBeGreaterThan(collapsed.widthPx)
  })

  it('labels the core hours and thins out near the floor', () => {
    const w = resolveWindow({ nowMin: 12 * 60, availablePx: FLOOR_PX })
    expect(w.ticks[0]).toEqual({ leftPx: CORE_LEFT, label: '06:00' })
    expect(w.ticks.at(-1)).toEqual({ leftPx: CORE_LEFT + 18 * PX_PER_HOUR, label: '24:00' })
    expect(w.ticks).toHaveLength(10)
  })

  it('centres now on the core, and pins it to the boundary inside the band', () => {
    expect(resolveWindow({ nowMin: 15 * 60, availablePx: FLOOR_PX }).nowPx).toBe(
      CORE_LEFT + 9 * PX_PER_HOUR
    )
    // 03:00, band collapsed: pinned to the band's inner edge.
    expect(resolveWindow({ nowMin: 3 * 60, availablePx: FLOOR_PX }).nowPx).toBe(CORE_LEFT)
    // 04:00 with the band expanded: drawn at real scale inside the band.
    expect(
      resolveWindow({ nowMin: 4 * 60, availablePx: FLOOR_PX, expansion: { morning: true } }).nowPx
    ).toBe(4 * PX_PER_HOUR)
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
      [member(0, 'Me', [session([partial('camera', 360, 420)], [{ title: 'Read', atMin: 390 }])])],
      input()
    )
    expect(rows[0].bars).toEqual([
      { leftPx: CORE_LEFT, widthPx: PX_PER_HOUR, mode: 'camera', live: false },
    ])
    expect(rows[0].dots).toEqual([{ leftPx: CORE_LEFT + PX_PER_HOUR / 2, title: 'Read' }])
  })

  it('does not draw a dot for a planned-only task', () => {
    const planned = session([partial('voice', 360, 420)])
    planned.tasks = [{ id: 't1' as Id<'task'>, title: 'Planned', planned: true, completedAt: null }]

    const rows = toTimelineRows([member(0, 'Me', [planned])], input())
    expect(rows[0].dots).toEqual([])
  })

  it('marks a running partial live and extends it to now', () => {
    const rows = toTimelineRows(
      [member(0, 'Me', [session([partial('screenShare', 840, null)])])],
      input({ now: at(15 * 60) })
    )
    expect(rows[0].bars[0]).toEqual({
      leftPx: CORE_LEFT + 8 * PX_PER_HOUR,
      widthPx: PX_PER_HOUR,
      mode: 'screenShare',
      live: true,
    })
  })

  it('draws the evening hours at full scale instead of clipping them', () => {
    const rows = toTimelineRows(
      [member(0, 'Me', [session([partial('voice', 22 * 60, 23 * 60)])])],
      input({ now: at(23 * 60) })
    )
    expect(rows[0].bars).toEqual([
      { leftPx: CORE_LEFT + 16 * PX_PER_HOUR, widthPx: PX_PER_HOUR, mode: 'voice', live: false },
    ])
    expect(rows[0].hiddenCount).toBe(0)
  })

  it('clips a bar at the night boundary and counts the hidden part', () => {
    const rows = toTimelineRows(
      [member(0, 'Me', [session([partial('voice', 4 * 60, 7 * 60)])])],
      input({ now: at(7 * 60) })
    )
    // 06:00–07:00 visible in the core; 04:00–06:00 hidden in the night band.
    expect(rows[0].bars).toEqual([
      { leftPx: CORE_LEFT, widthPx: PX_PER_HOUR, mode: 'voice', live: false },
    ])
    expect(rows[0].hiddenCount).toBe(1)
  })

  it('places a planned session on the lane as pixels', () => {
    const planned = {
      ...member(0, 'Me', []),
      plans: [{ id: 'p1' as Id<'plannedSession'>, startAt: at(16 * 60), endAt: at(17 * 60) }],
    }
    const rows = toTimelineRows([planned], input())
    expect(rows[0].plans).toEqual([
      { leftPx: CORE_LEFT + 10 * PX_PER_HOUR, widthPx: PX_PER_HOUR, missed: false },
    ])
    expect(rows[0].planBlocks).toEqual([
      {
        startPx: CORE_LEFT + 10 * PX_PER_HOUR,
        endPx: CORE_LEFT + 11 * PX_PER_HOUR,
      },
    ])
  })

  it('exposes every plan as a drag wall', () => {
    const planned = {
      ...member(0, 'Me', []),
      plans: [
        { id: 'p1' as Id<'plannedSession'>, startAt: at(13 * 60), endAt: at(14 * 60) },
        { id: 'p2' as Id<'plannedSession'>, startAt: at(16 * 60), endAt: at(17 * 60) },
      ],
    }
    const rows = toTimelineRows([planned], input())
    expect(rows[0].planBlocks).toEqual([
      { startPx: CORE_LEFT + 7 * PX_PER_HOUR, endPx: CORE_LEFT + 8 * PX_PER_HOUR },
      { startPx: CORE_LEFT + 10 * PX_PER_HOUR, endPx: CORE_LEFT + 11 * PX_PER_HOUR },
    ])
  })

  it('marks a plan that ended without voice evidence as missed', () => {
    const planned = {
      ...member(0, 'Me', []),
      plans: [{ id: 'p1' as Id<'plannedSession'>, startAt: at(13 * 60), endAt: at(14 * 60) }],
    }
    const rows = toTimelineRows([planned], input())
    expect(rows[0].plans[0].missed).toBe(true)
  })

  it('does not mark a missed plan as such when voice overlapped it', () => {
    const planned = {
      ...member(0, 'Me', [session([partial('camera', 13 * 60, 14 * 60)])]),
      plans: [{ id: 'p1' as Id<'plannedSession'>, startAt: at(13 * 60), endAt: at(14 * 60) }],
    }
    const rows = toTimelineRows([planned], input())
    expect(rows[0].plans[0].missed).toBe(false)
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
    expect(rows[0].hiddenCount).toBe(1)
  })
})

describe('autoExpansionAt', () => {
  it("opens the band through the morning, past the band's own 06:00 edge", () => {
    expect(autoExpansionAt(3 * 60)).toEqual({ morning: true })
    expect(autoExpansionAt(7 * 60)).toEqual({ morning: true })
  })

  it('leaves it collapsed from the auto-open hour onward', () => {
    expect(autoExpansionAt(9 * 60)).toEqual({ morning: false })
    expect(autoExpansionAt(12 * 60)).toEqual({ morning: false })
  })
})

describe('mergeExpansion', () => {
  it('opens the band when either manual or auto asks for it', () => {
    expect(mergeExpansion({ morning: false }, { morning: true })).toEqual({ morning: true })
  })

  it('never lets a manual collapse close an auto-opened band', () => {
    expect(mergeExpansion({ morning: false }, { morning: true })).toEqual({ morning: true })
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
