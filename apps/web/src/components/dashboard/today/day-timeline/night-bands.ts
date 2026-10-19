import type { TimelineRowVM, TimelineWindow } from '@studytrack/backend/convex/timeline/types'
import type { NightBandVM } from './types'

// Derived axis decoration: the night band with its pixel offset, and the
// activity the collapsed band hides (summed across the room, shown as a marker
// rather than force-opening it). Pure — and the React Compiler memoizes the
// call sites, so it needs no manual memoization.
export function nightBands(axis: TimelineWindow, rows: TimelineRowVM[]) {
  const bands: NightBandVM[] = []
  let offsetPx = 0
  for (const segment of axis.segments) {
    if (segment.kind === 'band') bands.push({ segment, offsetPx })
    offsetPx += segment.widthPx
  }

  return { bands, hidden: rows.reduce((count, row) => count + row.hiddenCount, 0) }
}
