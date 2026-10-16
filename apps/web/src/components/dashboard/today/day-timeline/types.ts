import type { BandSide, TimelineWindow } from '@studytrack/backend/convex/timeline/types'

// One night band segment (a collapsed or expanded end-of-day strip).
export type NightBandSegment = Extract<TimelineWindow['segments'][number], { kind: 'band' }>

// A night band placed on the axis: the segment plus its left offset in pixels,
// so the desktop track and the pinned mobile mirror draw identical strips.
export type NightBandVM = { segment: NightBandSegment; offsetPx: number }

// Activity hidden inside each collapsed band, summed across the room.
export type HiddenCounts = Record<BandSide, number>

// What every axis surface renders from: the window model, the night bands
// placed on it, and the shared band toggle. Surfaces read `axis.nowPx` for the
// now-line/pill instead of taking a separate `now` prop.
export type AxisSurface = {
  axis: TimelineWindow
  bands: NightBandVM[]
  hidden: HiddenCounts
  onToggleBand: (side: BandSide) => void
}
