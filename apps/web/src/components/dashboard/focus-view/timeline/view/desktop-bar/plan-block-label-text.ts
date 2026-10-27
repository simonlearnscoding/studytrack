import type { TimelineWindow } from '@studytrack/backend/convex/timeline/types'
import { formatClock, pxToMinute } from '@studytrack/backend/convex/timeline/util'

// The from – until label a resolved span wears. Gestures and the resting
// pointer all route through this, so the times read the same whichever is in
// flight.
export function planBlockSpanText(span: { startMin: number; endMin: number }): string {
  return `${formatClock(span.startMin)} – ${formatClock(span.endMin)}`
}

// The same label for a stored block, whose geometry is pixels only.
export function blockSpanText(
  segments: TimelineWindow['segments'],
  leftPx: number,
  widthPx: number
): string | null {
  const startMin = pxToMinute(segments, leftPx)
  const endMin = pxToMinute(segments, leftPx + widthPx)
  if (startMin == null || endMin == null) return null
  return `${formatClock(Math.round(startMin))} – ${formatClock(Math.round(endMin))}`
}
