import type { Id } from '@studytrack/backend/convex/_generated/dataModel'
import type { DayTask, TaskPlacement } from '@studytrack/backend/convex/tasks/types'

// The beta's row shape: the stored task plus its formatted completion time and
// its current plan chip. The Now marker is not carried on the row — the queue
// derives the sections and the today-only Now read says which row is the
// member's Now.
export type QueueTask = DayTask & {
  doneAt: string | null
  planLabel: string | null
}

export type TaskId = QueueTask['id']

// One of the Day's not-ended plan blocks, shown as a foldable group. `doneCount`
// and `totalCount` drive the progress in the heading; `openTasks` are the rows
// the body lists, in queue order. The live group is the one whose window contains
// the clock; the rest are upcoming, ordered by start.
export type PlanGroup = {
  planBlockId: Id<'planBlock'>
  title: string | null
  plannedStart: number
  plannedEnd: number
  isLive: boolean
  label: string
  windowLabel: string
  openTasks: QueueTask[]
  doneCount: number
  totalCount: number
}

// The queue for one Day, derived from its single stored order. `status` says
// whether the list is usable yet; every list is always an array. `unassignedTasks`
// is the main queue, `livePlanGroup`/`upcomingPlanGroups` are the plan sections,
// and Done always comes last. The split is a view — sorting inside a section
// permutes that section's tasks among the queue slots they already occupy.
export type DayTaskQueueState = {
  status: 'loading' | 'ready'
  openTasks: QueueTask[]
  doneTasks: QueueTask[]
  unassignedTasks: QueueTask[]
  livePlanGroup: PlanGroup | null
  upcomingPlanGroups: PlanGroup[]
  canScheduleForToday: boolean
  isViewingToday: boolean
}

// Every command the queue exposes, named for the domain intent rather than the
// Convex mutation behind it. The plan writes carry the post-drop queue order so
// the assignment and the position land atomically.
export type DayTaskQueueActions = {
  addTask: (title: string, placement?: TaskPlacement) => void
  renameTask: (id: TaskId, title: string) => void
  removeTask: (id: TaskId) => void
  toggleTaskDone: (id: TaskId) => void
  reorderTasks: (orderedTaskIds: TaskId[]) => void
  assignTaskToPlan: (id: TaskId, planBlockId: Id<'planBlock'>, orderedTaskIds: TaskId[]) => void
  unassignTaskFromPlan: (id: TaskId, planBlockId: Id<'planBlock'>, orderedTaskIds: TaskId[]) => void
  assignNewTask: (planBlockId: Id<'planBlock'>, title: string) => Promise<void>
  scheduleTaskForToday: (id: TaskId) => void
}

export type DayTaskQueue = {
  state: DayTaskQueueState
  actions: DayTaskQueueActions
}
