import { useEffect, useState, type RefObject } from 'react'

// The measured content width of an element, kept live with a ResizeObserver.
// Returns `fallback` until the element mounts and measures — the server and the
// first client paint agree on the fallback, so no hydration mismatch.
export function useElementWidth(ref: RefObject<HTMLElement | null>, fallback: number): number {
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? element.clientWidth
      setWidth((prev) => (Math.abs(prev - next) < 0.5 ? prev : next))
    })
    observer.observe(element)
    setWidth(element.clientWidth)
    return () => observer.disconnect()
  }, [ref])

  return width
}
