import type { TimelineWindow } from '@studytrack/backend/convex/timeline/types'
import { centreScrollLeft } from '@studytrack/backend/convex/timeline/util'
import { useEffect, type RefObject } from 'react'

// Open the track centred on "now", but only on mount and when the window itself
// changes (resize, band expand) — never on the ticking clock, so the view does
// not jump each second and a manual scroll survives. While a band is expanded
// (`expanded`) the revealed night sits at the axis start, so the snap parks at
// the beginning — showing the hours you just unfolded — instead of centring.
export function useCentreOnNow(
  scrollerRef: RefObject<HTMLDivElement | null>,
  axis: TimelineWindow,
  expanded: boolean
): void {
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollLeft = expanded
      ? 0
      : centreScrollLeft({
          nowPx: axis.nowPx,
          widthPx: axis.widthPx,
          availablePx: scroller.clientWidth,
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-snap on window change only
  }, [axis.widthPx, axis.overflow, expanded, scrollerRef])
}
