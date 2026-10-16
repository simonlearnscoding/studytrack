import type { TimelineRowVM, TimelineWindow } from '@studytrack/backend/convex/timeline/types'
import { useMemo } from 'react'
import type { HiddenCounts, NightBandVM } from './types'

// Derived axis decoration for the timeline, memoised so the render pass is cheap:
// the night bands with their pixel offsets, and the activity each collapsed band
// hides (summed across the room, shown as a marker rather than force-opening it).
export function useNightBands(axis: TimelineWindow, rows: TimelineRowVM[]) {
  const bands = useMemo(() => {
    const placed: NightBandVM[] = []
    let offsetPx = 0
    for (const segment of axis.segments) {
      if (segment.kind === 'band') placed.push({ segment, offsetPx })
      offsetPx += segment.widthPx
    }
    return placed
  }, [axis.segments])

  const hidden = useMemo<HiddenCounts>(
    () => ({
      morning: rows.reduce((count, row) => count + row.morningHidden, 0),
      evening: rows.reduce((count, row) => count + row.eveningHidden, 0),
    }),
    [rows]
  )

  return { bands, hidden }
}
