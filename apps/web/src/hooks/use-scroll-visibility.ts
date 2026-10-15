import { useEffect } from 'react'

/**
 * Paints the scrollbars only while the user is actually scrolling: a scroll flag
 * is set on <html> and cleared a beat after the last scroll. The app.css rules
 * key off `.is-scrolling`. Scroll doesn't bubble, so the listener is registered
 * in the capture phase to catch scrolls from any inner container too.
 */
export function useScrollVisibility(): void {
  useEffect(() => {
    const root = document.documentElement
    let timeout: number | undefined

    const onScroll = () => {
      root.classList.add('is-scrolling')
      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => root.classList.remove('is-scrolling'), 800)
    }

    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true })
      window.clearTimeout(timeout)
      root.classList.remove('is-scrolling')
    }
  }, [])
}
