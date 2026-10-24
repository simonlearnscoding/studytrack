import type { TimelineRowVM } from '@studytrack/backend/convex/timeline/types'
import type { RefObject } from 'react'
import { NowLine } from '../axis/markers'
import { BandLayer } from '../axis/night-band'
import { RowTrack, type WorkSessionClick } from '../lanes/row-track'
import type { AxisSurface } from '../../types'
import { useTrackPan } from './use-track-pan'

// The room's track area: the night bands, hour gridlines, the now-line, and one
// bar per member other than you (your track lives in the pinned lane above).
//
// Fluid on lg+ when the axis fits — overflow-x-clip trims the 1px ruler
// overhang without becoming a scroll container — and scrolls sideways when it
// doesn't. Safe either way: nothing sticky lives inside.
//
// Panning works three ways: trackpad / shift-wheel natively, touch natively,
// and mouse-drag here — dragging the room's rows acts as scroll. (Dragging
// *your* lane, in the pinned bar above, is a planning gesture instead — LD-6.)
export function TrackScroller({
  surface: { axis, bands, hidden, isNightBandHeldOpen, onToggleBand },
  rows,
  scrollerRef,
  onWorkSessionClick,
}: {
  surface: AxisSurface
  rows: TimelineRowVM[]
  scrollerRef: RefObject<HTMLDivElement | null>
  onWorkSessionClick?: (click: WorkSessionClick) => void
}) {
  const hasYourRow = rows.some((row) => row.you)
  const panHandlers = useTrackPan(scrollerRef)

  return (
    <div
      ref={scrollerRef}
      {...panHandlers}
      className={`min-w-0 cursor-grab pb-2 select-none active:cursor-grabbing ${
        axis.overflow ? 'overflow-x-auto' : 'overflow-x-clip'
      }`}
    >
      {/* a quiet room should not collapse the timeline: keep at least the
          height of a handful of lanes so the axis, grid and now-line stay
          legible even when only one or two people are on the track */}
      <div className="relative min-h-56" style={{ width: axis.widthPx }}>
        {/* the room's strip carries the "0–6" label; the fold control lives on
            the pinned ruler above, so each surface shows one thing */}
        <BandLayer
          bands={bands}
          hidden={hidden}
          isNightBandHeldOpen={isNightBandHeldOpen}
          showLabel
          showChevron={false}
          onToggle={onToggleBand}
        />

        {/* hour gridlines — from the very top so they meet the pinned bar's
            own lines across the seam (the bar's extend past its bottom) */}
        {axis.ticks.map((t) => (
          <div
            key={t.label}
            className="absolute top-0 bottom-2 w-px bg-white/[0.05]"
            style={{ left: t.leftPx }}
          />
        ))}

        {/* now-line — every live bar ends here; the pinned bar above draws its
            own segment, so this one spans the rows only. z-[3]: above the rows
            (z-[2]), below the pinned bar so it never crosses it. */}
        <NowLine left={axis.nowPx} className="top-0 bottom-1.5 z-[3]" />

        {/* contract: tracks only; the name column is the pinned sibling. a
            shadcn Popover hangs off each bar (workSession details) in prod. */}
        <div className={`relative z-[2] flex flex-col gap-3.5 ${hasYourRow ? 'lg:pt-3.5' : ''}`}>
          {rows
            .filter((row) => !row.you)
            .map((row) => (
              <div key={row.key} className="flex h-6 items-center">
                <RowTrack row={row} onWorkSessionClick={onWorkSessionClick} />
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
