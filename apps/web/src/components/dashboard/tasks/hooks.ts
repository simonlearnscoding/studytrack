import { api } from '@studytrack/backend/convex/_generated/api'
import { useMutation, useQuery } from 'convex/react'

// Shared view over the owner's tasks for today, consumed by the rail's task
// widget; one reactive Convex query, no duplicated state.
export function useMyTasks(dayStart: number) {
  const tasks = useQuery(api.tasks.listMine, { dayStart })
  const create = useMutation(api.tasks.create)
  const toggle = useMutation(api.tasks.toggle)

  const done = tasks?.filter((task) => task.done).length ?? 0
  const total = tasks?.length ?? 0

  return { tasks, create, toggle, total, done, open: total - done }
}
