import { api } from '@studytrack/backend/convex/_generated/api'
import { useMutation, useQuery } from 'convex/react'

// The member's live work session tracking: `isOnline` covers both a Discord
// work session and the manual web timer (the glossary's Online), while `isManual`
// says the web timer is the one running — only that one can be stopped here.
export type WorkSessionTracking = {
  isOnline: boolean
  isManual: boolean
  startedAt: number | null
  canStartManual: boolean
  startManual: () => void
  toggleManual: () => void
}

export function useTrackingStatus(): WorkSessionTracking {
  const status = useQuery(api.tracking.getMine)
  const start = useMutation(api.tracking.start)
  const stop = useMutation(api.tracking.stop)

  const isOnline = status?.mode != null
  const isManual = status?.mode === 'manual'
  // `status` is null until the Clerk user is synced to a users row. An object
  // with `mode: null` means the member is online but not in a work session yet.
  const canStartManual = status?.mode === null

  const startManual = () => {
    void start().catch(logTrackingError)
  }

  const stopManual = () => {
    void stop().catch(logTrackingError)
  }

  const toggleManual = () => {
    if (isManual) stopManual()
    else if (canStartManual) startManual()
  }

  return {
    isOnline,
    isManual,
    startedAt: status?.startedAt ?? null,
    canStartManual,
    startManual,
    toggleManual,
  }
}

function logTrackingError(error: unknown) {
  console.error('[studytrack] tracking change failed', error)
}
