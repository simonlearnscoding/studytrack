import { v, type Infer } from 'convex/values'
import type { Id } from '../_generated/dataModel'

// The dashboard's "today" is a shared calendar day; the caller passes its start
// so queries never read the wall clock (see ../sessions/util `startOfDay`).
export const listMineArgs = v.object({ dayStart: v.number() })
export const createTaskArgs = v.object({ title: v.string() })
export const toggleTaskArgs = v.object({ taskId: v.id('task') })
export const renameTaskArgs = v.object({ taskId: v.id('task'), title: v.string() })
export const removeTaskArgs = v.object({ taskId: v.id('task') })

export type ListMineArgs = Infer<typeof listMineArgs>
export type CreateTaskArgs = Infer<typeof createTaskArgs>
export type ToggleTaskArgs = Infer<typeof toggleTaskArgs>
export type RenameTaskArgs = Infer<typeof renameTaskArgs>
export type RemoveTaskArgs = Infer<typeof removeTaskArgs>

// The owner's view of one task. `completedAt` is null while Open.
export type Task = {
  id: Id<'task'>
  title: string
  done: boolean
  completedAt: number | null
}
