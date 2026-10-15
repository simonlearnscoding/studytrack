import type { BandSide, ExpansionState } from '@studytrack/backend/convex/timeline/types'
import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'studytrack.timeline.expansion'
const COLLAPSED: ExpansionState = { morning: false, evening: false }

// The user's *manual* night-band expansion, persisted per browser so a band they
// opened survives a reload (LD-1). Auto-expansion is transient and lives
// elsewhere — only the manual choice is stored.
//
// localStorage is modelled as an external store so the server and first paint
// agree on "both collapsed" and the client re-reads after mount, without a
// setState-in-effect.
let snapshot: ExpansionState | null = null
const listeners = new Set<() => void>()

function read(): ExpansionState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return COLLAPSED
    return { ...COLLAPSED, ...(JSON.parse(raw) as Partial<ExpansionState>) }
  } catch {
    return COLLAPSED
  }
}

function getSnapshot(): ExpansionState {
  if (snapshot === null) snapshot = read()
  return snapshot
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  const onStorage = () => {
    snapshot = read()
    onChange()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

export function useExpansionPreference(): [ExpansionState, (side: BandSide) => void] {
  const expansion = useSyncExternalStore(subscribe, getSnapshot, () => COLLAPSED)

  const toggle = useCallback((side: BandSide) => {
    const next = { ...getSnapshot(), [side]: !getSnapshot()[side] }
    snapshot = next
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Storage full or blocked: keep the in-memory choice for this visit.
    }
    for (const listener of listeners) listener()
  }, [])

  return [expansion, toggle]
}
