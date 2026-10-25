import { useState } from 'react'

// Keep the last defined value while a query reloads, so changing its key does not
// blank the surface for one round trip. Convex has no placeholderData equivalent.
export function useLastDefined<T>(value: T | undefined): T | undefined {
  const [lastDefined, setLastDefined] = useState<T | undefined>(value)
  if (value !== undefined && value !== lastDefined) setLastDefined(value)
  return value ?? lastDefined
}
