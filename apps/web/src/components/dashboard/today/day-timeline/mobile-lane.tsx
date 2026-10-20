import type { TimelineBarVM, TimelineRowVM } from '@studytrack/backend/convex/timeline/types'
import { useRef, type RefObject } from 'react'
import { HourLabels, NowLine, NowPill } from './axis-markers'
import { BandLayer } from './night-band'
import { RowName } from './row-name'
import { RowTrack } from './row-track'
import type { AxisSurface } from './types'
import { useMirrorScroll } from './use-mirror-scroll'

// <lg the page scrolls, so your labels + track pin flush under the site header
// as their own full-bleed bar (same surface recipe as the header: bg + blur +
// border-b, no gap above) while the room scrolls under.
export function PinnedMobileLane({
  surface: { axis, bands, hidden, locked, onToggleBand },
  row,
  nowLabel,
  scrollerRef,
  onSessionClick,
}: { surface: AxisSurface } & {
  row: TimelineRowVM
  nowLabel: string
  scrollerRef: RefObject<HTMLDivElement | null>
  onSessionClick?: (sessionId: TimelineBarVM['sessionId']) => void
}) {
  const mirrorRef = useRef<HTMLDivElement>(null)
  useMirrorScroll(scrollerRef, mirrorRef)
  const now = axis.nowPx

  return (
    <div className="sticky top-14 z-30 -mx-3.5 border-b border-border bg-background/80 px-3.5 pt-2 pb-1 backdrop-blur lg:hidden">
      <div className="flex gap-2">
        <div className="w-40 shrink-0">
          <div className="h-[30px]" />
          <div className="flex h-6 items-center gap-1.5">
            <RowName row={row} />
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden pb-4">
          {/* the axis mirror — panned by useMirrorScroll, clipped by the box */}
          <div ref={mirrorRef} className="relative" style={{ width: axis.widthPx }}>
            {/* the same night bands as the track, tappable with a thumb and
                sharing the desktop expansion choice */}
            <BandLayer bands={bands} hidden={hidden} locked={locked} onToggle={onToggleBand} />
            {/* the now-line through the whole lane — full height so the pill
                (opaque) just paints over its top, seam-free */}
            <NowLine left={now} className="top-0 bottom-0 z-[2]" />
            <div className="relative h-[30px]">
              <HourLabels ticks={axis.ticks} widthPx={axis.widthPx} className="bottom-0" />
              <NowPill label={nowLabel} left={now} className="top-0 z-[3]" />
            </div>
            <div className="flex h-6 items-center">
              <RowTrack row={row} onSessionClick={onSessionClick} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
