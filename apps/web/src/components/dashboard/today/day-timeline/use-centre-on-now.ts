import type { TimelineWindow } from '@studytrack/backend/convex/timeline/types'
import { centreScrollLeft } from '@studytrack/backend/convex/timeline/util'
import { useEffect, type RefObject } from 'react'

// Open the track centred on "now", but only on mount and when the window itself
// changes (resize, band expand) — never on the ticking clock, so the view does
// not jump each second and a manual scroll survives.
export function useCentreOnNow(
  scrollerRef: RefObject<HTMLDivElement | null>,
  axis: TimelineWindow
): void {
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollLeft = centreScrollLeft({
      nowPx: axis.nowPx,
      widthPx: axis.widthPx,
      availablePx: scroller.clientWidth,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-snap on window change only
  }, [axis.widthPx, axis.overflow, scrollerRef])
}
