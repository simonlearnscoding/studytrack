import { useEffect, type RefObject } from 'react'

// Keeps one axis copy — an axis-width div inside a pinned lane — panned in
// lockstep with the sideways scroller: translateX(-scrollLeft).
//
// Each pinned surface (the mobile lane, the desktop bar) calls this with its
// own mirror ref, so mounting and unmounting is handled by that component's
// effect lifecycle; nothing else needs to know the mirror exists.
export function useMirrorScroll(
  scrollerRef: RefObject<HTMLDivElement | null>,
  mirrorRef: RefObject<HTMLDivElement | null>
): void {
  useEffect(() => {
    const scroller = scrollerRef.current
    const mirror = mirrorRef.current
    if (!scroller || !mirror) return
    const sync = () => {
      mirror.style.transform = `translateX(${-scroller.scrollLeft}px)`
    }
    sync()
    scroller.addEventListener('scroll', sync, { passive: true })
    return () => scroller.removeEventListener('scroll', sync)
  }, [scrollerRef, mirrorRef])
}
