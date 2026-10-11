import { useAuth, useUser } from '@clerk/tanstack-react-start'
import { api } from '@studytrack/backend/convex/_generated/api'
import { useMutation } from 'convex/react'
import { useEffect, useRef } from 'react'

// Links the signed-in Clerk user to their Discord id. Idempotent — the bot may
// have already created the `users` row.
export function useSyncClerkUser() {
  const { user } = useUser()
  const { isSignedIn } = useAuth()
  const upsert = useMutation(api.users.upsertFromClerk)
  const synced = useRef(false)

  useEffect(() => {
    if (!isSignedIn || !user || synced.current) return
    synced.current = true

    const discord = user.externalAccounts.find((account) => account.provider === 'discord')
    upsert({
      discordId: discord?.providerUserId,
      name: user.fullName ?? user.username ?? undefined,
      image: user.imageUrl,
    }).catch((error) => console.error('[studytrack] failed to sync user', error))
  }, [isSignedIn, user, upsert])
}
