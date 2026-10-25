import { api } from '@studytrack/backend/convex/_generated/api'
import type { Preference } from '@studytrack/backend/convex/preferences/types'
import type { OptimisticLocalStore } from 'convex/browser'

/**
 * Merge one field into the cached Preferences. Every Preference write is
 * optimistic, and this is the one place that knows the query to patch and that
 * the patch must spread the cached value rather than replace it. A missing cache
 * entry is left alone: the live query will arrive with the server's value.
 */
export function optimisticPreference<K extends keyof Preference>(
  localStore: OptimisticLocalStore,
  key: K,
  value: Preference[K]
): void {
  const cachedPreference = localStore.getQuery(api.preferences.mine, {})
  if (cachedPreference === undefined) return
  localStore.setQuery(api.preferences.mine, {}, { ...cachedPreference, [key]: value })
}
