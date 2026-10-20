import { api } from '@studytrack/backend/convex/_generated/api'
import type { Metric } from '@studytrack/backend/convex/preferences/types'
import { useMutation, useQuery } from 'convex/react'

/**
 * The member's remembered metric Preference, read live from Convex. A member who
 * never chose — or a signed-out visitor — gets Deep focus. Convex dedupes the
 * subscription, so every surface can call this without extra reads.
 */
export function useMetric(): Metric {
  return useQuery(api.preferences.mine)?.metric ?? 'focus'
}

/**
 * The metric switch's value plus a writer. The write is optimistic, so the
 * toggle flips before the round-trip. A signed-out click is rejected and the
 * optimistic value rolls back — nothing is remembered.
 */
export function useMetricPreference(): [Metric, (metric: Metric) => void] {
  const metric = useMetric()
  const save = useMutation(api.preferences.setMetric).withOptimisticUpdate((localStore, args) => {
    localStore.setQuery(api.preferences.mine, {}, { metric: args.metric })
  })

  function choose(next: Metric) {
    save({ metric: next }).catch(() => {
      // Signed out: the write is rejected; the live value rolls back.
    })
  }

  return [metric, choose]
}
