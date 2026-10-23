import { api } from '@studytrack/backend/convex/_generated/api'
import type { TaskPlacement } from '@studytrack/backend/convex/tasks/types'
import { useMutation, useQuery } from 'convex/react'

// Shared view over the owner's tasks for the viewed Day, consumed by the rail's
// task widget; one reactive Convex query, no duplicated state. Creating a task
// plans it for that Day, so the component never has to carry the Day itself.
export function useMyTasks(dayStart: number) {
  const tasks = useQuery(api.tasks.listMine, { dayStart })
  const createTask = useMutation(api.tasks.create)
  const toggle = useMutation(api.tasks.toggle)
  const rename = useMutation(api.tasks.rename)
  const remove = useMutation(api.tasks.remove)

  const create = (args: { title: string; placement?: TaskPlacement }) =>
    createTask({ ...args, plannedAt: dayStart })

  const done = tasks?.filter((task) => task.done).length ?? 0
  const total = tasks?.length ?? 0

  return { tasks, create, toggle, rename, remove, total, done, open: total - done }
}
