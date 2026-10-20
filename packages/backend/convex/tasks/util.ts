import type { Id } from '../_generated/dataModel'
import type { Task } from './types'

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
