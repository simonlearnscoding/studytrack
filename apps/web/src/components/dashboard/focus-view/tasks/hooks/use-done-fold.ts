import { api } from '@studytrack/backend/convex/_generated/api'
import { useMutation, useQuery } from 'convex/react'

/**
 * The member's remembered Done-group fold state, read live from Convex. Global
 * across every Day, expanded by default. `undefined` while the Preference is
 * still loading, so a surface with Done tasks can hold the body back instead of
 * showing rows and then folding them away.
 *
 * The write is optimistic: the group folds before the round-trip, and a failed
 * save rolls back to the server's value. The cache patch merges the flag into
 * the current Preference rather than replacing it, so the metric is untouched.
 */
export function useDoneFold(): [boolean | undefined, (folded: boolean) => void] {
  const preference = useQuery(api.preferences.mine)
  const save = useMutation(api.preferences.setDoneFolded).withOptimisticUpdate(
    (localStore, args) => {
      const cachedPreference = localStore.getQuery(api.preferences.mine, {})
      if (cachedPreference === undefined) return
      localStore.setQuery(
        api.preferences.mine,
        {},
        {
          ...cachedPreference,
          isDoneFolded: args.folded,
        }
      )
    }
  )

  function setFolded(folded: boolean) {
    save({ folded }).catch(() => {
      // Signed out: the write is rejected; the live value rolls back.
    })
  }

  return [preference?.isDoneFolded, setFolded]
}
