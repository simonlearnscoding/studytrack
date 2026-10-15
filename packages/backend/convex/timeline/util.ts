import type { DashboardMember } from '../sessions/types'
import { formatDuration, memberTotalMs } from '../sessions/util'
import type {
  BandSide,
  ExpansionState,
  TimelineBarVM,
  TimelineDotVM,
  TimelineRowVM,
  TimelineSegment,
  TimelineTick,
  TimelineWindow,
} from './types'
import { DAY_MINUTES } from './types'

const MINUTE_MS = 60_000

// The fixed full-scale window (LD-1 / the expansion spec): 05:00–22:00, with
// 00:00–05:00 and 22:00–24:00 drawn as collapsible night bands at the ends.
export const CORE_START_MIN = 5 * 60
export const CORE_END_MIN = 22 * 60
const CORE_HOURS = (CORE_END_MIN - CORE_START_MIN) / 60
// The axis never shrinks past this; below it the track scrolls instead.
export const PX_PER_HOUR_FLOOR = 48
// The width of a squashed night band, and the hour step at which labels stop
// colliding near the floor.
const BAND_COLLAPSED_PX = 32
const TICK_STEP_WIDE_MIN = 60
const TICK_STEP_NARROW_MIN = 120

const NO_EXPANSION: ExpansionState = { morning: false, evening: false }

// A "now" expressed in minutes since the day start, the track's own measured
// width, and which night bands the user (or the clock) has opened. `availablePx`
// is the timeline's container width, not the viewport's — the column it sits in
// changes with the rails (LD-1).
export type WindowInput = {
  nowMin: number
  availablePx: number
  expansion?: ExpansionState
}

// Build the axis from the clock, the track's own width, and the expansion
// state. Pure: it never reads the wall clock or the DOM.
//
// The px/hour is decided once from the *collapsed* baseline, so expanding a band
// never rescales the core — it keeps the scale and widens the axis (you scroll
// more). The axis only starts scrolling once it falls past the 48px/h floor.
export function resolveWindow({
  nowMin,
  availablePx,
  expansion = NO_EXPANSION,
}: WindowInput): TimelineWindow {
  const collapsedReserve = 2 * BAND_COLLAPSED_PX
  const pxPerHour = Math.max(PX_PER_HOUR_FLOOR, (availablePx - collapsedReserve) / CORE_HOURS)

  const segments: TimelineSegment[] = [
    bandSegment('morning', 0, CORE_START_MIN, 5 * pxPerHour, expansion.morning),
    {
      kind: 'core',
      startMin: CORE_START_MIN,
      endMin: CORE_END_MIN,
      widthPx: CORE_HOURS * pxPerHour,
    },
    bandSegment('evening', CORE_END_MIN, DAY_MINUTES, 2 * pxPerHour, expansion.evening),
  ]
  const widthPx = segments.reduce((sum, segment) => sum + segment.widthPx, 0)
  const stepMin = pxPerHour >= 64 ? TICK_STEP_WIDE_MIN : TICK_STEP_NARROW_MIN

  return {
    segments,
    ticks: buildTicks(segments, stepMin),
    widthPx,
    nowPx: resolveNowPx(segments, nowMin),
    overflow: widthPx > availablePx + 0.5,
  }
}

// The backend payload plus the things a live query cannot carry: the wall clock,
// the day the payload was read against, and which member is "you".
export type TimelineInput = {
  now: number
  dayStart: number
  me: string | null
  window: TimelineWindow
}

// Map the dashboard payload to positioned rows. Pure, ctx-free, no clock read —
// the adapter receives `now` and `dayStart` and returns pixels. Activity inside a
// collapsed band is not drawn; it is counted as a hidden marker instead.
export function toTimelineRows(members: DashboardMember[], input: TimelineInput): TimelineRowVM[] {
  const { now, me } = input
  const isYou = (member: DashboardMember) => me !== null && String(member.userId) === me
  return [...members]
    .sort(
      (a, b) => Number(isYou(b)) - Number(isYou(a)) || memberTotalMs(b, now) - memberTotalMs(a, now)
    )
    .map((member) => toRow(member, input))
}

// Minutes since the day start for an instant.
export function toMinute(instant: number, dayStart: number): number {
  return (instant - dayStart) / MINUTE_MS
}

// Which band the clock opens on its own: before 05:00 the morning, at/after
// 22:00 the evening. Pure — the caller latches this for the visit so crossing
// 05:00 does not snap it shut (LD-1).
export function autoExpansionAt(nowMin: number): ExpansionState {
  return { morning: nowMin < CORE_START_MIN, evening: nowMin >= CORE_END_MIN }
}

// Combine the user's manual expansion with the clock's. Either one opening a
// band keeps it open; a manual collapse never overrides an auto-open.
export function mergeExpansion(manual: ExpansionState, auto: ExpansionState): ExpansionState {
  return {
    morning: manual.morning || auto.morning,
    evening: manual.evening || auto.evening,
  }
}

// The scroll offset that puts "now" at the centre of the viewport, clamped to
// the real ends of the axis (0 … width − viewport) so the timeline never scrolls
// into empty space past 00:00 or 24:00 (LD-1 edge-centring).
export function centreScrollLeft({
  nowPx,
  widthPx,
  availablePx,
}: {
  nowPx: number
  widthPx: number
  availablePx: number
}): number {
  const max = Math.max(0, widthPx - availablePx)
  const centred = nowPx - availablePx / 2
  return Math.max(0, Math.min(max, centred))
}

// A wall-clock label for a minute-of-day, e.g. 1110 → "18:30", 1440 → "24:00".
export function formatClock(minute: number): string {
  const clamped = Math.max(0, Math.min(DAY_MINUTES, Math.round(minute)))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Where a minute-of-day lands on the axis, or null when it is hidden inside a
// collapsed band.
export function minuteToPx(segments: TimelineSegment[], minute: number): number | null {
  const hit = segmentAt(segments, minute)
  if (!hit || isHidden(hit.segment)) return null
  return hit.px
}

function toRow(
  member: DashboardMember,
  { now, dayStart, me, window }: TimelineInput
): TimelineRowVM {
  const bars: TimelineBarVM[] = []
  const dots: TimelineDotVM[] = []
  const hidden: Record<BandSide, number> = { morning: 0, evening: 0 }

  for (const session of member.sessions) {
    const sessionHidden = new Set<BandSide>()

    for (const partial of session.partials) {
      const startMin = toMinute(partial.startedAt, dayStart)
      const endMin = toMinute(partial.endedAt ?? now, dayStart)
      forEachVisibleSpan(
        window.segments,
        startMin,
        endMin,
        (leftPx, widthPx) =>
          bars.push({ leftPx, widthPx, mode: partial.mode, live: partial.endedAt === null }),
        (side) => sessionHidden.add(side)
      )
    }

    for (const task of session.tasks) {
      const hit = segmentAt(window.segments, toMinute(task.completedAt, dayStart))
      if (!hit) continue
      if (isHidden(hit.segment)) sessionHidden.add(hit.segment.side)
      else dots.push({ leftPx: hit.px })
    }

    for (const side of sessionHidden) hidden[side]++
  }

  return {
    key: String(member.userId ?? member.discordId),
    name: member.name ?? member.discordId,
    image: member.image,
    you: me !== null && String(member.userId) === me,
    live: member.online,
    tail: formatDuration(memberTotalMs(member, now)),
    bars: bars.sort((a, b) => a.leftPx - b.leftPx),
    dots: dots.sort((a, b) => a.leftPx - b.leftPx),
    morningHidden: hidden.morning,
    eveningHidden: hidden.evening,
  }
}

// Walk a minute span across the axis, emitting one bar piece per visible
// segment and reporting each collapsed band the span crosses.
function forEachVisibleSpan(
  segments: TimelineSegment[],
  startMin: number,
  endMin: number,
  addBar: (leftPx: number, widthPx: number) => void,
  addHidden: (side: BandSide) => void
): void {
  const lo = Math.min(startMin, endMin)
  const hi = Math.max(startMin, endMin)
  let offset = 0
  for (const segment of segments) {
    const from = Math.max(lo, segment.startMin)
    const to = Math.min(hi, segment.endMin)
    if (to > from) {
      if (isHidden(segment)) {
        addHidden(segment.side)
      } else {
        const span = segment.endMin - segment.startMin
        const a = offset + ((from - segment.startMin) / span) * segment.widthPx
        const b = offset + ((to - segment.startMin) / span) * segment.widthPx
        addBar(Math.min(a, b), Math.abs(b - a))
      }
    }
    offset += segment.widthPx
  }
}

function isHidden(segment: TimelineSegment): segment is Extract<TimelineSegment, { kind: 'band' }> {
  return segment.kind === 'band' && segment.collapsed
}

function bandSegment(
  side: BandSide,
  startMin: number,
  endMin: number,
  expandedWidthPx: number,
  expanded: boolean
): Extract<TimelineSegment, { kind: 'band' }> {
  return {
    kind: 'band',
    side,
    startMin,
    endMin,
    widthPx: expanded ? expandedWidthPx : BAND_COLLAPSED_PX,
    collapsed: !expanded,
    label: side === 'morning' ? '0–5' : '22–24',
  }
}

// The segment a minute belongs to, with its axis-relative pixel. Half-open
// intervals, except the last which includes its end so 24:00 resolves.
function segmentAt(
  segments: TimelineSegment[],
  minute: number
): { px: number; segment: TimelineSegment; offsetPx: number } | null {
  let offset = 0
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const isLast = i === segments.length - 1
    const within =
      minute >= segment.startMin && (isLast ? minute <= segment.endMin : minute < segment.endMin)
    if (within) {
      const span = segment.endMin - segment.startMin
      const frac = span === 0 ? 0 : (minute - segment.startMin) / span
      return { px: offset + frac * segment.widthPx, segment, offsetPx: offset }
    }
    offset += segment.widthPx
  }
  return null
}

// "now" clamped onto the axis: inside a collapsed band it sits on the band's
// inner edge (the core boundary) rather than disappearing.
function resolveNowPx(segments: TimelineSegment[], nowMin: number): number {
  const hit = segmentAt(segments, nowMin)
  if (hit && !isHidden(hit.segment)) return hit.px
  if (nowMin < CORE_START_MIN) return segments[0].widthPx
  let offset = 0
  for (const segment of segments) {
    if (segment.kind === 'band' && segment.side === 'evening') return offset
    offset += segment.widthPx
  }
  return offset
}

function buildTicks(segments: TimelineSegment[], stepMin: number): TimelineTick[] {
  const ticks: TimelineTick[] = []
  const seen = new Set<number>()
  let offset = 0
  for (const segment of segments) {
    if (!isHidden(segment)) {
      const span = segment.endMin - segment.startMin
      const minutes = new Set<number>()
      for (let minute = segment.startMin; minute < segment.endMin; minute += stepMin) {
        minutes.add(minute)
      }
      minutes.add(segment.endMin)
      for (const minute of minutes) {
        const leftPx = offset + ((minute - segment.startMin) / span) * segment.widthPx
        const key = Math.round(leftPx)
        if (seen.has(key)) continue
        seen.add(key)
        ticks.push({ leftPx, label: formatClock(minute) })
      }
    }
    offset += segment.widthPx
  }
  return ticks
}
