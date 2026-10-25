import type { TimelineRowVM, TimelineWindow } from '@studytrack/backend/convex/timeline/types'
import { nightBands } from '@studytrack/backend/convex/timeline/bands'
import type { RefObject } from 'react'
import {
  PinnedDesktopBar,
  type PlanBlockClick,
  type PlanBlockDraft,
  type PlanBlockDrag,
  type PlanBlockUpdate,
} from './desktop-bar'
import { PinnedMobileLane } from './lanes/mobile-lane'
import { NamesColumn } from './lanes/names-column'
import { TrackLegend } from './track-legend'
import type { WorkSessionClick } from './lanes/row-track'
import { TrackScroller } from './track-scroller'
import { useCentreOnNow } from '../hooks/use-centre-on-now'

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
//
// This index is the composition root of view/: `axis/` draws the ruler and night
// bands, `lanes/` draws names and bars, `desktop-bar/` owns your pinned lane and
// its gestures, and `track-scroller/` owns the room's sideways track.
export function DayTimeline({
  window: axis,
  rows,
  nowLabel,
  showNow,
  scrollerRef,
  isNightBandHeldOpen,
  onToggleBand,
  draftPlanBlock,
  onPlanBlockDrag,
  onPlanBlockDoubleClick,
  onPlanBlockUpdate,
  onPlanBlockClick,
  onWorkSessionClick,
}: {
  window: TimelineWindow
  rows: TimelineRowVM[]
  nowLabel: string
  showNow: boolean
  scrollerRef: RefObject<HTMLDivElement | null>
  isNightBandHeldOpen: boolean
  onToggleBand: () => void
  draftPlanBlock?: PlanBlockDraft | null
  onPlanBlockDrag?: (span: PlanBlockDrag) => void
  onPlanBlockDoubleClick?: (span: PlanBlockDrag) => void
  onPlanBlockUpdate?: (update: PlanBlockUpdate) => void
  onPlanBlockClick?: (click: PlanBlockClick) => void
  onWorkSessionClick?: (click: WorkSessionClick) => void
}) {
  const yourRow = rows.find((row) => row.you)
  const { bands, hidden } = nightBands(axis, rows)
  // A band is open (by click or by the clock): the revealed night is at the axis
  // start, so the view opens on its beginning.
  const bandExpanded = bands.length > 0 && !bands[0].segment.collapsed
  useCentreOnNow(scrollerRef, axis, bandExpanded)
  const surface = { axis, bands, hidden, isNightBandHeldOpen, onToggleBand }

  return (
    <section>
      <TrackLegend />

      {yourRow && (
        <PinnedMobileLane
          surface={surface}
          row={yourRow}
          nowLabel={nowLabel}
          showNow={showNow}
          scrollerRef={scrollerRef}
          onPlanBlockClick={onPlanBlockClick}
          onWorkSessionClick={onWorkSessionClick}
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
            showNow={showNow}
            scrollerRef={scrollerRef}
            draftPlanBlock={draftPlanBlock}
            onPlanBlockDrag={onPlanBlockDrag}
            onPlanBlockDoubleClick={onPlanBlockDoubleClick}
            onPlanBlockUpdate={onPlanBlockUpdate}
            onPlanBlockClick={onPlanBlockClick}
            onWorkSessionClick={onWorkSessionClick}
          />
          <TrackScroller
            surface={surface}
            rows={rows}
            showNow={showNow}
            scrollerRef={scrollerRef}
            onWorkSessionClick={onWorkSessionClick}
          />
        </div>
      </div>
    </section>
  )
}
