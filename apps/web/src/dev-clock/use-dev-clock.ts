import { api } from '@studytrack/backend/convex/_generated/api'
import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/workSessions/util'
import { useMutation, useQuery } from 'convex/react'
import { useDateStore } from '~/state/date.store'

export const MINUTE_MS = 60_000
export const HOUR_MS = 60 * MINUTE_MS
export const DAY_MS = 24 * HOUR_MS

// The web must opt in before it calls the devClock module at all. Local dev can
// point at a deployment that does not have the module yet; a skipped query keeps
// that dashboard working instead of throwing. Production builds never set this.
const isDevClockBuild = import.meta.env.VITE_DEV_CLOCK === '1'

// The dev clock offset is deployment-wide and lives on the server, so the ticking
// client clock and the clock the server uses for writes start from the same
// value. Production always reads zero (see devClock/service).
export function useDevClockOffset(): number {
  return useQuery(api.devClock.get, isDevClockBuild ? {} : 'skip')?.offsetMs ?? 0
}

export function useDevClock() {
  const clock = useQuery(api.devClock.get, {})
  const selectToday = useDateStore((state) => state.selectToday)
  const save = useMutation(api.devClock.setOffset).withOptimisticUpdate((localStore, args) => {
    const cachedClock = localStore.getQuery(api.devClock.get, {})
    if (cachedClock === undefined) return
    localStore.setQuery(api.devClock.get, {}, { ...cachedClock, offsetMs: args.offsetMs })
  })

  const enabled = clock?.enabled ?? false
  const offsetMs = clock?.offsetMs ?? 0

  // A day jump is the gesture that changes which Day is "today", so it moves the
  // Focus day with it. Smaller jumps stay on the Day already being viewed.
  function move(deltaMs: number) {
    if (!enabled) return
    const nextOffsetMs = offsetMs + deltaMs
    void save({ offsetMs: nextOffsetMs }).catch(logClockError)
    if (Math.abs(deltaMs) === DAY_MS) {
      selectToday(new Date(startOfDay(Date.now() + nextOffsetMs, DASHBOARD_TIME_ZONE)))
    }
  }

  // Reset is the only way back to the production clock, and it returns the Focus
  // day as well so no surface is left on the fake day.
  function reset() {
    if (!enabled) return
    void save({ offsetMs: 0 }).catch(logClockError)
    selectToday(new Date())
  }

  return { enabled, offsetMs, move, reset }
}

function logClockError(error: unknown) {
  console.error('[studytrack] dev clock change failed', error)
}
