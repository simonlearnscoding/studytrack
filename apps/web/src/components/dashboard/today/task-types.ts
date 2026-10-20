import type { Task } from '@studytrack/backend/convex/tasks/types'

// The beta's row shape: the stored task plus the two things the UI derives — the
// NOW marker and the formatted completion time.
export type QueueTask = Task & {
  active: boolean
  doneAt: string | null
}

export type TaskId = QueueTask['id']
