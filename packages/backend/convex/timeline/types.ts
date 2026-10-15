import type { StudyMode } from '../bot/types'

// A day, in minutes from the day start (midnight). The timeline works in these
// instead of timestamps so the adapter stays clock-agnostic and DST-free.
export const DAY_MINUTES = 24 * 60

// The two collapsed ends of the day. "morning" is 00:00–05:00, "evening" is
// 22:00–24:00 (see LD-1 / the expansion spec).
export type BandSide = 'morning' | 'evening'

// One slice of the horizontal axis. The core is the fixed full-scale window;
// a band is a night end, either squashed to a thin collapsed strip or grown to
// real scale when expanded.
export type TimelineSegment =
  | { kind: 'core'; startMin: number; endMin: number; widthPx: number }
  | {
      kind: 'band'
      side: BandSide
      startMin: number
      endMin: number
      widthPx: number
      collapsed: boolean
      label: string
    }

// One hour label on the axis. Positions are axis-relative pixels.
export type TimelineTick = { leftPx: number; label: string }

// The resolved axis: its segments, its hour ticks, its total width, and where
// "now" lands. Pure output of `resolveWindow`, consumed by the view only.
export type TimelineWindow = {
  segments: TimelineSegment[]
  ticks: TimelineTick[]
  widthPx: number
  nowPx: number
  overflow: boolean
}

// One stretch of a member's day on the track. `live` marks a running partial.
export type TimelineBarVM = {
  leftPx: number
  widthPx: number
  mode: StudyMode
  live: boolean
}

// A completed task, marked where it was ticked off.
export type TimelineDotVM = { leftPx: number }

// One member's row, already positioned on the axis. No timestamps survive this
// far — the view renders pixels only.
export type TimelineRowVM = {
  key: string
  name: string
  image: string | null
  you: boolean
  live: boolean
  tail: string
  bars: TimelineBarVM[]
  dots: TimelineDotVM[]
  // Counts of activity hidden inside each collapsed band (LD-13). Zero until a
  // band is collapsed.
  morningHidden: number
  eveningHidden: number
}
