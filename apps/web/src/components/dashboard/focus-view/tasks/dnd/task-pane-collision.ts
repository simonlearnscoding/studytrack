import type { Id } from '@studytrack/backend/convex/_generated/dataModel'
import { closestCenter, pointerWithin, type CollisionDetection } from '@dnd-kit/core'

export const SCHEDULE_FOR_TODAY_DROP_ID = 'schedule-for-today'
export const MAIN_QUEUE_DROP_ID = 'main-queue'

export function planGroupDropId(planBlockId: Id<'planBlock'>) {
  return `plan-group:${planBlockId}`
}

function isSectionContainer(id: string | number) {
  return id === MAIN_QUEUE_DROP_ID || (typeof id === 'string' && id.startsWith('plan-group:'))
}

// A row under the pointer always beats its enclosing section, so dropping on a
// task means "place it here". The section container is the target only for the
// heading or an empty body. The today rail wins over both, so a past Day can
// still take the task out of the pane. Keyboard lifts have no pointer, so the
// closest enabled droppable is the fallback that walks rows and sections alike.
export const taskPaneCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args)
  const todayHit = pointerHits.find((hit) => hit.id === SCHEDULE_FOR_TODAY_DROP_ID)
  if (todayHit) return [todayHit]

  const rowHit = pointerHits.find((hit) => !isSectionContainer(hit.id))
  if (rowHit) return [rowHit]

  const sectionHit = pointerHits.find((hit) => isSectionContainer(hit.id))
  if (sectionHit) return [sectionHit]

  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) => container.id !== SCHEDULE_FOR_TODAY_DROP_ID
    ),
  })
}
