import type { PlanBlockTask, PlanTaskStats } from './types'

// Where a plan block sits relative to the caller's clock. Derived, never stored:
// a flag would go stale the moment the clock crossed the boundary (ADR-0012).
export type PlanPhase = 'upcoming' | 'live' | 'past'

export function planPhase(plannedStart: number, plannedEnd: number, now: number): PlanPhase {
  if (now < plannedStart) return 'upcoming'
  if (now < plannedEnd) return 'live'
  return 'past'
}

// A past block's outcome. A completion counts as inside only when its instant is
// known and falls in the half-open window: blocks may touch at an edge, so the
// instant at the end belongs to the next block, never to both. A Done task with
// no instant stays in its own bucket — calling it "outside" would claim a time
// nobody knows (ADR-0010).
export function countPlanTasks(
  tasks: Pick<PlanBlockTask, 'done' | 'completedAt'>[],
  plannedStart: number,
  plannedEnd: number
): PlanTaskStats {
  const stats: PlanTaskStats = { doneInside: 0, doneOutside: 0, doneUnknownTime: 0, open: 0 }
  for (const task of tasks) {
    if (!task.done) {
      stats.open += 1
      continue
    }
    if (task.completedAt === null) {
      stats.doneUnknownTime += 1
      continue
    }
    if (task.completedAt >= plannedStart && task.completedAt < plannedEnd) stats.doneInside += 1
    else stats.doneOutside += 1
  }
  return stats
}
