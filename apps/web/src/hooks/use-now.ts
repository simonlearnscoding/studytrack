import { useEffect, useState } from 'react'

// A ticking "now" for the client. The server never sends the wall clock, so the
// cards derive every live duration against this. Kept as a single interval at the
// dashboard root — never one per card.
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
