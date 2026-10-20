import { v, type Infer } from 'convex/values'
import type { Id } from '../_generated/dataModel'

// The dashboard's "today" is a shared calendar day; the caller passes its start
// so queries never read the wall clock (see ../sessions/util `startOfDay`).
export const listMineArgs = v.object({ dayStart: v.number() })
export const createTaskArgs = v.object({ title: v.string(), plannedAt: v.number() })
export const toggleTaskArgs = v.object({ taskId: v.id('task') })
export const renameTaskArgs = v.object({ taskId: v.id('task'), title: v.string() })
export const removeTaskArgs = v.object({ taskId: v.id('task') })
export const reorderTasksArgs = v.object({
  dayStart: v.number(),
  orderedTaskIds: v.array(v.id('task')),
})
export const setActiveTaskArgs = v.object({ taskId: v.id('task') })
export const clearActiveArgs = v.object({})

export type ListMineArgs = Infer<typeof listMineArgs>
export type CreateTaskArgs = Infer<typeof createTaskArgs>
export type ToggleTaskArgs = Infer<typeof toggleTaskArgs>
export type RenameTaskArgs = Infer<typeof renameTaskArgs>
export type RemoveTaskArgs = Infer<typeof removeTaskArgs>
export type ReorderTasksArgs = Infer<typeof reorderTasksArgs>
export type SetActiveTaskArgs = Infer<typeof setActiveTaskArgs>
export type ClearActiveArgs = Infer<typeof clearActiveArgs>

// The owner's view of one task. `completedAt` is null while Open; `plannedAt` is
// the Day start it is planned for; `plannedSessionId` is null unless planned into
// a Session.
export type Task = {
  id: Id<'task'>
  title: string
  done: boolean
  completedAt: number | null
  plannedAt: number
  plannedSessionId: Id<'session'> | null
}

// The caller's one active task, with the instant it became active.
export type ActiveTask = {
  task: Task
  activeSince: number
}
