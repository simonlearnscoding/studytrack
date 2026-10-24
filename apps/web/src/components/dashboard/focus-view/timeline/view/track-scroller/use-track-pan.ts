import {
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'

// A press only becomes a pan once the pointer has moved this far; below it the
// click keeps its real target (a workSession bar can open its popover).
const PAN_START_PX = 4

type PanDrag = {
  pointerId: number
  lastX: number
  startX: number
  moved: boolean
  captured: boolean
}

// Mouse drag-to-pan for the room's track area. Trackpad, shift-wheel and touch
// scroll natively; this fills the mouse-drag gap. It owns only the pointer
// state — the rendered scroller stays in the component.
export function useTrackPan(scrollerRef: RefObject<HTMLDivElement | null>) {
  const pan = useRef<PanDrag | null>(null)
  const suppressClick = useRef(false)

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    suppressClick.current = false
    if ((event.target as HTMLElement).closest('button')) return
    pan.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      startX: event.clientX,
      moved: false,
      captured: false,
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = pan.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (!drag.moved && Math.abs(event.clientX - drag.startX) > PAN_START_PX) drag.moved = true
    if (!drag.moved) return
    if (!drag.captured) {
      event.currentTarget.setPointerCapture(event.pointerId)
      drag.captured = true
    }
    const scroller = scrollerRef.current
    if (scroller) scroller.scrollLeft -= event.clientX - drag.lastX
    drag.lastX = event.clientX
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = pan.current
    if (drag?.pointerId !== event.pointerId) return
    if (drag.moved) suppressClick.current = true
    pan.current = null
  }

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pan.current?.pointerId !== event.pointerId) return
    pan.current = null
  }

  // Captured after a pan, before the bar's own click handler runs.
  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return
    suppressClick.current = false
    event.stopPropagation()
    event.preventDefault()
  }

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture }
}
