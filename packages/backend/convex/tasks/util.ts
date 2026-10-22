import type { Doc, Id } from '../_generated/dataModel'
import type { Task, TaskPlacement } from './types'

// The up-next suggestion, derived from an oldest-first Day list. It is the first
// Open task below the active row, or the first Open task when nothing is active.
// It never wraps back to the top and never starts anything by itself.
export function pickUpNext(tasks: Task[], activeTaskId: Id<'task'> | null): Task | null {
  const activeIndex = activeTaskId ? tasks.findIndex((task) => task.id === activeTaskId) : -1
  for (let i = activeIndex + 1; i < tasks.length; i++) {
    if (!tasks[i].done) return tasks[i]
  }
  return null
}

// The manual order of a Day. `position` is authoritative; tasks written before
// the field existed (or before the backfill ran) keep creation order, after the
// positioned ones. Ties fall back to the creation instant.
export function byPosition(a: Doc<'task'>, b: Doc<'task'>): number {
  if (a.position !== undefined && b.position !== undefined && a.position !== b.position) {
    return a.position - b.position
  }
  if (a.position !== undefined && b.position === undefined) return -1
  if (a.position === undefined && b.position !== undefined) return 1
  return a._creationTime - b._creationTime
}

// The displayed order of a Day: Open tasks first, Done tasks after, each group in
// manual position order. Checking a task therefore drops it to the bottom without
// rewriting its position, so reopening returns it to its place.
export function byQueueOrder(a: Doc<'task'>, b: Doc<'task'>): number {
  if (a.done !== b.done) return a.done ? 1 : -1
  return byPosition(a, b)
}

// Where a new Open task lands in a Day already in queue order. `now` goes to the
// very top (the first Open task is Now), `next` right after the current Now, and
// `end` at the bottom. An empty Day accepts every placement at index 0.
export function insertionIndex(tasks: Doc<'task'>[], placement: TaskPlacement): number {
  if (placement === 'end') return tasks.length
  if (placement === 'now') return 0
  return tasks.some((task) => !task.done) ? 1 : 0
}

// The final Day order after a drag: the ids the caller sent, in that order, then
// every other task of the Day in its current order. Extra tasks (added on another
// device mid-drag) are kept instead of failing the write.
export function planOrder(tasks: Doc<'task'>[], orderedIds: Id<'task'>[]): Doc<'task'>[] {
  const byId = new Map(tasks.map((task) => [task._id, task]))
  const ordered: Doc<'task'>[] = []
  for (const id of orderedIds) {
    const task = byId.get(id)
    if (!task) throw new Error('Task not found')
    ordered.push(task)
  }
  const sent = new Set(orderedIds)
  return [...ordered, ...tasks.filter((task) => !sent.has(task._id))]
}
