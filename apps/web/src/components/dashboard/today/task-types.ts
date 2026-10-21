import type { Task } from '@studytrack/backend/convex/tasks/types'

// The beta's row shape: the stored task plus the formatted completion time. The
// Now marker is not carried on the row — the queue derives it from position.
export type QueueTask = Task & {
  doneAt: string | null
}

export type TaskId = QueueTask['id']
