import type { Task, TaskPlacement } from '@studytrack/backend/convex/tasks/types'

// The beta's row shape: the stored task plus the formatted completion time. The
// Now marker is not carried on the row — the queue derives the top Open row and
// the today-only Now read says whether that row is the member's Now.
export type QueueTask = Task & {
  doneAt: string | null
}

export type TaskId = QueueTask['id']

// The queue for one Day, derived from its single stored order. `status` says
// whether the list is usable yet; the two lists are always arrays. Done always
// comes after Open, but the split is a view — there is no second ordering.
// `topOpen` is just the first Open row of this Day; it is Now only when
// `isViewingToday`. `canScheduleForToday` answers the pane's question without
// leaking the Day arithmetic behind it.
export type DayTaskQueueState = {
  status: 'loading' | 'ready'
  openTasks: QueueTask[]
  doneTasks: QueueTask[]
  topOpen: QueueTask | undefined
  canScheduleForToday: boolean
  isViewingToday: boolean
}

// Every command the queue exposes, named for the domain intent rather than the
// Convex mutation behind it.
export type DayTaskQueueActions = {
  addTask: (title: string, placement?: TaskPlacement) => void
  renameTask: (id: TaskId, title: string) => void
  removeTask: (id: TaskId) => void
  toggleTaskDone: (id: TaskId) => void
  reorderTasks: (orderedTaskIds: TaskId[]) => void
  scheduleTaskForToday: (id: TaskId) => void
}

export type DayTaskQueue = {
  state: DayTaskQueueState
  actions: DayTaskQueueActions
}
