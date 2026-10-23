import { closestCenter, pointerWithin, type CollisionDetection } from '@dnd-kit/core'

export const SCHEDULE_FOR_TODAY_DROP_ID = 'schedule-for-today'

// A drop on the today rail wins over the nearest sortable row, so the task
// leaves this Day instead of reordering inside it. The rail is only a candidate
// under the pointer: reordering never snaps to it from across the pane.
export const taskPaneCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args)
  const todayHit = pointerHits.find((hit) => hit.id === SCHEDULE_FOR_TODAY_DROP_ID)
  if (todayHit) return [todayHit]
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) => container.id !== SCHEDULE_FOR_TODAY_DROP_ID
    ),
  })
}
