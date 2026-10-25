import { useEffect, useState } from 'react'
import { useDevClockOffset } from '~/dev-clock/use-dev-clock'

// A ticking "now" for the client. The server never sends the wall clock, so the
// cards derive every live duration against this. Kept as a single interval at the
// dashboard root — never one per card. On a dev deployment the deployment-wide
// offset is added, which is the same offset the server uses for writes.
export function useNow(intervalMs = 1000): number {
  const offsetMs = useDevClockOffset()
  const [realNow, setRealNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setRealNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  // The offset arrives with the live clock read. Adding it to the last tick puts
  // every surface on the fake clock; the next tick catches the remaining drift.
  return realNow + offsetMs
}
