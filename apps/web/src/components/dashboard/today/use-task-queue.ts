import { useState } from 'react'
import { upNext, type Task } from './data'

// A task with a stable id — the mock list is keyed by title elsewhere, which
// collides the moment two tasks share a name.
export type QueueTask = Task & { id: string }

/**
 * The single source of truth for today's task queue. Owned by `TodayLayout` and
 * shared by the desktop pane and the mobile dock, so both surfaces stay
 * interactive and never disagree about which task is active.
 *
 * The active pointer is session-scoped: nothing is active unless tracking is on
 * (`live`), and stopping tracking clears it.
 */
export function useTaskQueue(initial: Task[], initialLive: boolean) {
  const [items, setItems] = useState<QueueTask[]>(() =>
    initial.map((task, i) => ({ ...task, id: `seed-${i}` }))
  )
  const [live, setLive] = useState(initialLive)
  // The seeded task is already active; its clock starts on the client. The value
  // is only ever rendered once mounted, so the server timestamp can't mismatch.
  const [activeSince, setActiveSince] = useState<number | null>(() =>
    initial.some((task) => task.active) ? Date.now() : null
  )

  const active = items.find((task) => task.active && !task.done)
  const next = upNext(items)

  const add = (title: string) =>
    setItems((prev) => [...prev, { id: crypto.randomUUID(), txt: title }])

  const rename = (id: string, title: string) => {
    const trimmed = title.trim()
    if (!trimmed) return
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, txt: trimmed } : t)))
  }

  const remove = (id: string) => setItems((prev) => prev.filter((t) => t.id !== id))

  const tick = (id: string) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done, active: false } : t)))
    if (active?.id === id) setActiveSince(null)
  }

  const setActive = (id: string) => {
    if (!live || items.find((t) => t.id === id)?.done) return
    if (active?.id === id) {
      clearActive()
      return
    }
    setItems((prev) => prev.map((t) => ({ ...t, active: t.id === id })))
    setActiveSince(Date.now())
  }

  const clearActive = () => {
    setItems((prev) => prev.map((t) => ({ ...t, active: false })))
    setActiveSince(null)
  }

  const startTracking = () => setLive(true)

  const toggleTracking = () => {
    if (live) clearActive()
    setLive(!live)
  }

  return {
    items,
    live,
    active,
    next,
    activeSince,
    add,
    rename,
    remove,
    tick,
    setActive,
    clearActive,
    startTracking,
    toggleTracking,
  }
}

export type TaskQueue = ReturnType<typeof useTaskQueue>
