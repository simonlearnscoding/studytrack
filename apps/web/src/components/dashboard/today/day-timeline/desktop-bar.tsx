import type { TimelineRowVM } from '@studytrack/backend/convex/timeline/types'
import { useRef, type RefObject } from 'react'
import { HourLabels, NowLine, NowPill } from './axis-markers'
import { BandLayer } from './night-band'
import { RowTrack } from './row-track'
import type { AxisSurface } from './types'
import { useMirrorScroll } from './use-mirror-scroll'

// lg+ your labels + track pin as one bar directly under the hero (0..4.75rem),
// with the same bg + blur so the stack reads as a single element.
//
// The bar renders OUTSIDE the sideways scroller — a horizontal scroll container
// also captures vertical sticky descendants, so nothing that pins to the page
// may live inside it. Instead it holds an axis-width mirror that the scroll
// effect pans, and overflow-x-clip trims the overhang WITHOUT creating a scroll
// container — which is also why the pill may poke above the bar.
export function PinnedDesktopBar({
  surface: { axis, bands, hidden, onToggleBand },
  row,
  nowLabel,
  scrollerRef,
}: { surface: AxisSurface } & {
  row?: TimelineRowVM
  nowLabel: string
  scrollerRef: RefObject<HTMLDivElement | null>
}) {
  const mirrorRef = useRef<HTMLDivElement>(null)
  useMirrorScroll(scrollerRef, mirrorRef)
  const now = axis.nowPx

  return (
    <div className="sticky top-19 z-[6] overflow-x-clip bg-background/80 backdrop-blur max-lg:hidden">
      {/* the axis mirror — panned by useMirrorScroll, clipped by the bar */}
      <div ref={mirrorRef} className="relative" style={{ width: axis.widthPx }}>
        {/* the night bands, tappable here too — same strips, same toggle */}
        <BandLayer bands={bands} hidden={hidden} onToggle={onToggleBand} />
        {/* the now-line through the whole bar, run 0.875rem past the bottom so
            it bridges the gap to the scroller's own line below and reads as one
            line from pill to the last row */}
        <NowLine left={now} className="inset-y-0 -bottom-3.5" />
        <div className="relative h-6">
          <HourLabels ticks={axis.ticks} widthPx={axis.widthPx} className="top-3" />
          <NowPill label={nowLabel} left={now} className="-top-4 z-[7]" />
        </div>
        {/* your lane — the line's segment meets the live bar's leading edge, so
            the lane reads as the line's origin. Without a signed-in row the bar
            degrades to the hour strip. */}
        {row && (
          <div className="flex h-13 items-start pt-6">
            <RowTrack row={row} />
          </div>
        )}
      </div>
    </div>
  )
}
