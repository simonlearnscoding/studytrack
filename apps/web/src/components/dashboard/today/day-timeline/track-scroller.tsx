import type { TimelineRowVM } from '@studytrack/backend/convex/timeline/types'
import type { RefObject } from 'react'
import { NowLine } from './axis-markers'
import { BandLayer } from './night-band'
import { RowTrack } from './row-track'
import type { AxisSurface } from './types'

// The room's track area: the night bands, hour gridlines, the now-line, and one
// bar per member other than you (your track lives in the pinned lane above).
//
// Fluid on lg+ when the axis fits — overflow-x-clip trims the 1px ruler
// overhang without becoming a scroll container — and scrolls sideways when it
// doesn't. Safe either way: nothing sticky lives inside.
export function TrackScroller({
  surface: { axis, bands, hidden, onToggleBand },
  rows,
  scrollerRef,
}: { surface: AxisSurface } & {
  rows: TimelineRowVM[]
  scrollerRef: RefObject<HTMLDivElement | null>
}) {
  const hasYourRow = rows.some((row) => row.you)

  return (
    <div
      ref={scrollerRef}
      className={`min-w-0 pb-2 ${hasYourRow ? 'lg:mt-3.5' : ''} ${
        axis.overflow ? 'overflow-x-auto' : 'overflow-x-clip'
      }`}
    >
      <div className="relative min-h-10" style={{ width: axis.widthPx }}>
        <BandLayer bands={bands} hidden={hidden} onToggle={onToggleBand} />

        {/* hour gridlines */}
        {axis.ticks.map((t) => (
          <div
            key={t.label}
            className="absolute top-5 bottom-2 w-px bg-white/[0.05]"
            style={{ left: t.leftPx }}
          />
        ))}

        {/* now-line — every live bar ends here; the pinned bar above draws its
            own segment, so this one spans the rows only. z-[3]: above the rows
            (z-[2]), below the pinned bar so it never crosses it. */}
        <NowLine left={axis.nowPx} className="top-0 bottom-1.5 z-[3]" />

        {/* contract: tracks only; the name column is the pinned sibling. a
            shadcn Popover hangs off each bar (session details) in prod. */}
        <div className="relative z-[2] flex flex-col gap-3.5">
          {rows
            .filter((row) => !row.you)
            .map((row) => (
              <div key={row.key} className="flex h-6 items-center">
                <RowTrack row={row} />
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
