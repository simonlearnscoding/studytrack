import { api } from '@studytrack/backend/convex/_generated/api'
import type { TaskPlan } from '@studytrack/backend/convex/tasks/types'
import type { OptimisticLocalStore } from 'convex/browser'
import type { TaskId } from '../task-types'

// Patch one Day's cached list without touching anything else. The plan writes
// and the reorder share these so a failed mutation rolls back to the server's
// list in one step.
export function optimisticTaskPlan(
  localStore: OptimisticLocalStore,
  dayStart: number,
  taskId: TaskId,
  plan: TaskPlan | null
) {
  const currentTasks = localStore.getQuery(api.tasks.listMine, { dayStart })
  if (currentTasks === undefined) return

  localStore.setQuery(
    api.tasks.listMine,
    { dayStart },
    currentTasks.map((task) => (task.id === taskId ? { ...task, plan } : task))
  )
}

// Apply a new queue order immediately. Tasks the caller did not mention keep
// their relative order at the end, so a partial reorder never drops a task.
export function optimisticTaskOrder(
  localStore: OptimisticLocalStore,
  dayStart: number,
  orderedTaskIds: TaskId[]
) {
  const currentTasks = localStore.getQuery(api.tasks.listMine, { dayStart })
  if (currentTasks === undefined) return

  const tasksById = new Map(currentTasks.map((task) => [task.id, task]))
  const orderedIds = new Set(orderedTaskIds)
  const orderedTasks = orderedTaskIds.flatMap((id) => {
    const task = tasksById.get(id)
    return task ? [task] : []
  })
  const unlistedTasks = currentTasks.filter((task) => !orderedIds.has(task.id))

  localStore.setQuery(api.tasks.listMine, { dayStart }, [...orderedTasks, ...unlistedTasks])
}
