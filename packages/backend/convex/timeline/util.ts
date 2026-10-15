import type { DashboardMember } from '../sessions/types'
import { formatDuration, memberTotalMs } from '../sessions/util'
import type {
  TimelineBarVM,
  TimelineDotVM,
  TimelineRowVM,
  TimelineSegment,
  TimelineTick,
  TimelineWindow,
} from './types'
import { DAY_MINUTES } from './types'

const MINUTE_MS = 60_000

// A "now" expressed in minutes since the day start, and how wide the track's
// own container is. `availablePx` is the timeline's measured width, not the
// viewport's — the column it sits in changes with the rails (LD-1).
export type WindowInput = {
  nowMin: number
  availablePx: number
}

// Build the axis from the clock and the track's own width. Pure: it never
// reads the wall clock or the DOM.
//
// T1 ships the trivial axis — a single full-scale 00:00–24:00 core with no
// night bands. T2 replaces the body with the fixed 05:00–22:00 window and its
// collapsible night without changing this signature.
export function resolveWindow({ nowMin, availablePx }: WindowInput): TimelineWindow {
  const widthPx = Math.max(availablePx, 1)
  const segments: TimelineSegment[] = [{ kind: 'core', startMin: 0, endMin: DAY_MINUTES, widthPx }]
  return {
    segments,
    ticks: buildTicks(segments, 120),
    widthPx,
    nowPx: minuteToPx(segments, nowMin) ?? 0,
    overflow: false,
  }
}

// The backend payload plus the two things a live query cannot carry: the wall
// clock and which member is "you".
export type TimelineInput = {
  now: number
  dayStart: number
  me: string | null
  window: TimelineWindow
}

// Map the dashboard payload to positioned rows. Pure, ctx-free, no clock read —
// the adapter receives `now` and `dayStart` and returns pixels.
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
  const hit = locate(segments, minute)
  if (!hit || hit.hidden) return null
  return hit.leftPx
}

function toRow(
  member: DashboardMember,
  { now, dayStart, me, window }: TimelineInput
): TimelineRowVM {
  const bars: TimelineBarVM[] = []
  const dots: TimelineDotVM[] = []

  for (const session of member.sessions) {
    for (const partial of session.partials) {
      const leftPx = minuteToPx(window.segments, toMinute(partial.startedAt, dayStart))
      const endPx = minuteToPx(window.segments, toMinute(partial.endedAt ?? now, dayStart))
      if (leftPx === null || endPx === null) continue
      bars.push({
        leftPx: Math.min(leftPx, endPx),
        widthPx: Math.abs(endPx - leftPx),
        mode: partial.mode,
        live: partial.endedAt === null,
      })
    }
    for (const task of session.tasks) {
      const leftPx = minuteToPx(window.segments, toMinute(task.completedAt, dayStart))
      if (leftPx !== null) dots.push({ leftPx })
    }
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
    morningHidden: 0,
    eveningHidden: 0,
  }
}

// The segment a minute belongs to, with its axis-relative offset. Half-open
// intervals, except the last which includes its end so 24:00 resolves.
function locate(
  segments: TimelineSegment[],
  minute: number
): { leftPx: number; hidden: boolean } | null {
  let offset = 0
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const isLast = i === segments.length - 1
    const within =
      minute >= segment.startMin && (isLast ? minute <= segment.endMin : minute < segment.endMin)
    if (within) {
      if (segment.kind === 'band' && segment.collapsed) return { leftPx: offset, hidden: true }
      const span = segment.endMin - segment.startMin
      const frac = span === 0 ? 0 : (minute - segment.startMin) / span
      return { leftPx: offset + frac * segment.widthPx, hidden: false }
    }
    offset += segment.widthPx
  }
  return null
}

function buildTicks(segments: TimelineSegment[], stepMin: number): TimelineTick[] {
  const ticks: TimelineTick[] = []
  for (let minute = 0; minute <= DAY_MINUTES; minute += stepMin) {
    const leftPx = minuteToPx(segments, minute)
    if (leftPx === null) continue
    ticks.push({ leftPx, label: formatClock(minute) })
  }
  return ticks
}
