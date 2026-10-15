import type { ExpansionState } from '@studytrack/backend/convex/timeline/types'
import { autoExpansionAt } from '@studytrack/backend/convex/timeline/util'
import { useState } from 'react'

// The clock's own expansion: before 05:00 the morning band, at/after 22:00 the
// evening band. Latched for the visit — the state the page opened with is kept
// unioned with the live one, so crossing 05:00 does not snap the band shut.
// Transient: never persisted (LD-1).
export function useAutoExpansion(nowMin: number): ExpansionState {
  const [loadTime] = useState(() => autoExpansionAt(nowMin))
  const current = autoExpansionAt(nowMin)
  return {
    morning: loadTime.morning || current.morning,
    evening: loadTime.evening || current.evening,
  }
}
