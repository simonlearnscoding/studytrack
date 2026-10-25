import { useEffect, useState } from 'react'

// The plan popover searches on a delay, so typing stays instant and the server
// sees one query per pause rather than one per keystroke.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delayMs)
    return () => clearTimeout(timeout)
  }, [value, delayMs])

  return debouncedValue
}
