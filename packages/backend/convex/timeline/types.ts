import type { Id } from '../_generated/dataModel'
import type { StudyMode } from '../bot/types'

// A day, in minutes from the day start (midnight). The timeline works in these
// instead of timestamps so the adapter stays clock-agnostic and DST-free.
export const DAY_MINUTES = 24 * 60

// The one collapsed end of the day: the night before 06:00 (see LD-1 / the
// expansion spec). The axis runs to midnight, so 22:00–24:00 is core, not a band.
export type ExpansionState = { morning: boolean }

// One slice of the horizontal axis. The core is the fixed full-scale window;
// the band is the collapsed night before it, either squashed to a thin strip or
// grown to real scale when expanded.
export type TimelineSegment =
  | { kind: 'core'; startMin: number; endMin: number; widthPx: number }
  | {
      kind: 'band'
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

// A completed task, marked where it was ticked off — it carries its title so the
// lane can name the task at the moment it was done.
export type TimelineDotVM = { leftPx: number; title: string }

// A planned session block on the lane. `missed` marks a window that has passed
// without any voice evidence. A plan can be cut by a collapsed night band, so it
// is emitted as one piece per visible segment.
export type TimelinePlanVM = {
  id: Id<'plannedSession'>
  leftPx: number
  widthPx: number
  missed: boolean
}

// A plan's visible window on the axis, used by the drag gesture as a wall: a
// new plan may not start inside it or be dragged across it.
export type TimelinePlanBlockVM = {
  id: Id<'plannedSession'>
  startPx: number
  endPx: number
}

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
  plans: TimelinePlanVM[]
  planBlocks: TimelinePlanBlockVM[]
  dots: TimelineDotVM[]
  // How many of this member's sessions are hidden inside the collapsed night
  // band (LD-13). Zero until it collapses.
  hiddenCount: number
}

// Which cut of study time a row's tail duration fronts: Deep focus or Total.
// Purely presentational — lanes and their order never follow it (ST-12).
export type TimelineMetric = 'focus' | 'total'
