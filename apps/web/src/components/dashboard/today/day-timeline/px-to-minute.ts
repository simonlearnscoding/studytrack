import type { TimelineSegment } from '@studytrack/backend/convex/timeline/types'

// Where a pixel on the axis lands in minutes-of-day, or null when it points
// into a collapsed band — time there is squashed, so it has no real position.
// The inverse of `minuteToPx` in the backend util; lives here (web-side) until
// the planning work earns it a home next to `resolveWindow`.
export function pxToMinute(segments: TimelineSegment[], px: number): number | null {
  let offset = 0
  for (const segment of segments) {
    if (px < offset + segment.widthPx) {
      if (segment.kind === 'band' && segment.collapsed) return null
      const into = (px - offset) / segment.widthPx
      return segment.startMin + into * (segment.endMin - segment.startMin)
    }
    offset += segment.widthPx
  }
  return null
}
