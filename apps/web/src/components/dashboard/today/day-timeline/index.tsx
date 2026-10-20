import type { TimelineRowVM, TimelineWindow } from '@studytrack/backend/convex/timeline/types'
import type { RefObject } from 'react'
import { PinnedDesktopBar, type PlanDrag, type PlanUpdate } from './desktop-bar'
import { PinnedMobileLane } from './mobile-lane'
import { NamesColumn } from './names-column'
import { nightBands } from './night-bands'
import { TrackLegend } from './track-legend'
import { TrackScroller } from './track-scroller'
import { useCentreOnNow } from './use-centre-on-now'

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
  locked,
  onToggleBand,
  onPlanDrag,
  onPlanUpdate,
}: {
  window: TimelineWindow
  rows: TimelineRowVM[]
  nowLabel: string
  scrollerRef: RefObject<HTMLDivElement | null>
  locked: boolean
  onToggleBand: () => void
  onPlanDrag?: (span: PlanDrag) => void
  onPlanUpdate?: (update: PlanUpdate) => void
}) {
  const yourRow = rows.find((row) => row.you)
  const { bands, hidden } = nightBands(axis, rows)
  // A band is open (by click or by the clock): the revealed night is at the axis
  // start, so the view opens on its beginning.
  const bandExpanded = bands.length > 0 && !bands[0].segment.collapsed
  useCentreOnNow(scrollerRef, axis, bandExpanded)
  const surface = { axis, bands, hidden, locked, onToggleBand }

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
            onPlanDrag={onPlanDrag}
            onPlanUpdate={onPlanUpdate}
          />
          <TrackScroller surface={surface} rows={rows} scrollerRef={scrollerRef} />
        </div>
      </div>
    </section>
  )
}
