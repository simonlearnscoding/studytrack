// The milliseconds two half-open intervals [start, end) and [windowStart,
// windowEnd) share. Clipping a partial or a workSession span to a Day is one call.
export function overlapMs(
  start: number,
  end: number,
  windowStart: number,
  windowEnd: number
): number {
  return Math.max(0, Math.min(end, windowEnd) - Math.max(start, windowStart))
}
