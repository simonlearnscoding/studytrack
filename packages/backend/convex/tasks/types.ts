import { v, type Infer } from 'convex/values'
import type { Id } from '../_generated/dataModel'

// Where a new task lands in the Day's queue: at the bottom (Enter), right after
// the current Now (Shift+Enter), or at the top so it becomes Now (Ctrl+Enter).
export const taskPlacement = v.union(v.literal('end'), v.literal('next'), v.literal('now'))

// The dashboard's "today" is a shared calendar day; the caller passes its start
// so queries never read the wall clock (see ../workSessions/util `startOfDay`).
export const listMineArgs = v.object({ dayStart: v.number() })
// The plan popover's search over the caller's Open Tasks, across Days. `limit` is
// clamped by the service; the query is already debounced on the client.
export const searchTasksArgs = v.object({
  query: v.string(),
  limit: v.optional(v.number()),
})
export const createTaskArgs = v.object({
  title: v.string(),
  plannedAt: v.number(),
  placement: v.optional(taskPlacement),
})
// The Focus day the member is looking at when they tick the box. The server
// compares it with its own today: only then is the completion a live one.
export const toggleTaskArgs = v.object({
  taskId: v.id('task'),
  focusDayStart: v.number(),
})
export const renameTaskArgs = v.object({ taskId: v.id('task'), title: v.string() })
export const removeTaskArgs = v.object({ taskId: v.id('task') })
export const reorderTasksArgs = v.object({
  dayStart: v.number(),
  orderedTaskIds: v.array(v.id('task')),
})
export const rescheduleTaskArgs = v.object({
  taskId: v.id('task'),
  plannedAt: v.number(),
})
export const setActiveTaskArgs = v.object({ taskId: v.id('task') })
export const clearActiveArgs = v.object({})

export type TaskPlacement = Infer<typeof taskPlacement>
export type ListMineArgs = Infer<typeof listMineArgs>
export type SearchTasksArgs = Infer<typeof searchTasksArgs>
export type CreateTaskArgs = Infer<typeof createTaskArgs>
export type ToggleTaskArgs = Infer<typeof toggleTaskArgs>
export type RenameTaskArgs = Infer<typeof renameTaskArgs>
export type RemoveTaskArgs = Infer<typeof removeTaskArgs>
export type ReorderTasksArgs = Infer<typeof reorderTasksArgs>
export type RescheduleTaskArgs = Infer<typeof rescheduleTaskArgs>
export type SetActiveTaskArgs = Infer<typeof setActiveTaskArgs>
export type ClearActiveArgs = Infer<typeof clearActiveArgs>

// The owner's view of one task. `completedAt` is null while Open; `plannedAt` is
// the Day start it is planned for.
export type Task = {
  id: Id<'task'>
  title: string
  done: boolean
  completedAt: number | null
  plannedAt: number
}

// The plan block a task currently sits in: its name and window, enough for the
// task row's chip. `title` is null on a block written before ST-31.
export type TaskPlan = {
  planBlockId: Id<'planBlock'>
  title: string | null
  plannedStart: number
  plannedEnd: number
}

// A Day-row task, plus its most recent plan. The row is read without a clock, so
// `plan` may point at a block that has already ended; the ticking view decides
// whether it is still current (a task has at most one unended assignment).
export type DayTask = Task & {
  plan: TaskPlan | null
}

// The caller's one active task, with the instant it became active.
export type ActiveTask = {
  task: Task
  activeSince: number
}
