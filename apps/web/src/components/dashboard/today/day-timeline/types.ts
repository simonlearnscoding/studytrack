import type { NightBandVM, TimelineWindow } from '@studytrack/backend/convex/timeline/types'

// What every axis surface renders from: the window model, the night band
// placed on it, the activity the collapsed band hides, and the shared toggle.
// Surfaces read `axis.nowPx` for the now-line/pill instead of taking a separate
// `now` prop.
export type AxisSurface = {
  axis: TimelineWindow
  bands: NightBandVM[]
  hidden: number
  // True while the clock is holding a band open on its own: the band renders
  // open with no fold control, so a control that could not act is never shown.
  locked: boolean
  onToggleBand: () => void
}
