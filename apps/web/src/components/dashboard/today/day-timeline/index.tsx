import type {
  BandSide,
  TimelineRowVM,
  TimelineWindow,
} from '@studytrack/backend/convex/timeline/types'
import type { RefObject } from 'react'
import { PinnedDesktopBar } from './desktop-bar'
import { PinnedMobileLane } from './mobile-lane'
import { NamesColumn } from './names-column'
import { TrackLegend } from './track-legend'
import { TrackScroller } from './track-scroller'
import { useCentreOnNow } from './use-centre-on-now'
import { useNightBands } from './use-night-bands'

// The day timeline: one axis, seen through three synced surfaces.
//
//   PinnedMobileLane  <lg   your hour labels + track, pinned under the header
//   PinnedDesktopBar  lg+   your hour labels + track, pinned under the hero
//   TrackScroller     both  the room's tracks, the only sideways scroller
//
// Both pinned surfaces render OUTSIDE the scroller and hold an axis-width
// "mirror" div that useMirrorScroll translates by -scrollLeft: a horizontal
// scroll container also captures vertical sticky descendants, so nothing that
// pins to the page may live inside it. The names column is the scroller's
// pinned sibling — names never scroll sideways. Your name cell is the desktop
// bar's sticky twin (same height, same surface), so name and lane pin together.
export function DayTimeline({
  window: axis,
  rows,
  nowLabel,
  scrollerRef,
  onToggleBand,
}: {
  window: TimelineWindow
  rows: TimelineRowVM[]
  nowLabel: string
  scrollerRef: RefObject<HTMLDivElement | null>
  onToggleBand: (side: BandSide) => void
}) {
  const yourRow = rows.find((row) => row.you)
  const { bands, hidden } = useNightBands(axis, rows)
  useCentreOnNow(scrollerRef, axis)
  const surface = { axis, bands, hidden, onToggleBand }

  return (
    <section>
      <TrackLegend />

      {yourRow && (
        <PinnedMobileLane
          surface={surface}
          row={yourRow}
          nowLabel={nowLabel}
          scrollerRef={scrollerRef}
        />
      )}

      <div className="mt-4 flex gap-2 pb-2 max-lg:-mx-3.5 max-lg:px-3.5 lg:gap-0">
        <NamesColumn rows={rows} />

        {/* the track column: the pinned desktop bar above, the scroller below */}
        <div className="flex min-w-0 flex-1 flex-col pt-6 max-lg:pt-0">
          <PinnedDesktopBar
            surface={surface}
            row={yourRow}
            nowLabel={nowLabel}
            scrollerRef={scrollerRef}
          />
          <TrackScroller surface={surface} rows={rows} scrollerRef={scrollerRef} />
        </div>
      </div>
    </section>
  )
}
