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

// One night band segment (a collapsed or expanded end-of-day strip).
export type NightBandSegment = Extract<TimelineSegment, { kind: 'band' }>

// A night band placed on the axis: the segment plus its left offset in pixels,
// so the desktop track and the pinned mobile mirror draw identical strips.
export type NightBandVM = { segment: NightBandSegment; offsetPx: number }

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
// `workSessionId` is the sitting the stretch belongs to, so a click can open that
// workSession's details.
//
// The caps belong to the *workSession*, not to the stretch: its first visible piece
// always carries `roundStart`, and its last carries `roundEnd` once the workSession
// has ended on screen. Partial boundaries stay square, so a mode change or a
// pause-and-return reads as one continuous line instead of a row of pills.
export type TimelineBarVM = {
  workSessionId: Id<'workSession'>
  leftPx: number
  widthPx: number
  mode: StudyMode
  live: boolean
  roundStart: boolean
  roundEnd: boolean
}

// A completed task, marked where it was ticked off — it carries its title so the
// lane can name the task at the moment it was done.
export type TimelineDotVM = { leftPx: number; title: string }

// A planBlock drawn on the lane. `missed` marks a window that has passed without
// any voice evidence. `title` names the block and is public (ADR-0007); it is
// null for rows written before ST-31. `locked` means the block has started, so
// its window can no longer move; the view must not offer a drag for it. A
// planBlock can be cut by a collapsed night band, so it is emitted as one piece
// per visible segment.
export type TimelinePlanBlockVM = {
  id: Id<'planBlock'>
  title: string | null
  // The block's own window in Day minutes, so a surface that only has pixels
  // (the mobile lane) can still open the same popup the desktop bar opens.
  startMin: number
  endMin: number
  leftPx: number
  widthPx: number
  missed: boolean
  locked: boolean
}

// A planBlock's visible window on the axis, used by the drag gesture as a wall:
// a new planBlock may not start inside it or be dragged across it. `title` rides
// along so a gesture can send it back unchanged on the update mutation, and
// `locked` keeps a started block out of the gesture layer entirely.
export type TimelinePlanBlockWallVM = {
  id: Id<'planBlock'>
  title: string | null
  startPx: number
  endPx: number
  locked: boolean
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
  planBlocks: TimelinePlanBlockVM[]
  planBlockWalls: TimelinePlanBlockWallVM[]
  dots: TimelineDotVM[]
  // How many of this member's workSessions are hidden inside the collapsed night
  // band (LD-13). Zero until it collapses.
  hiddenCount: number
}

// Which cut of study time a row's tail duration fronts: Deep focus or Total.
// Purely presentational — lanes and their order never follow it (ST-12).
export type TimelineMetric = 'focus' | 'total'
