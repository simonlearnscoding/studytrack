import type { PlanBlockTask, PlanTaskStats } from './types'

// The planning grid: the drag snaps to quarters, so the backend only accepts
// marks on the same grain.
export const PLAN_BLOCK_GRAIN_MS = 15 * 60 * 1000
// The draft's proposal when nothing is in the way: the lane's double-click span.
export const DEFAULT_PLAN_BLOCK_LENGTH_MS = 2 * 60 * 60 * 1000

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

// What a draft opened from outside the lane should propose. `window` is safe to
// prefill; `blank` means the default collides with another block, so the member
// chooses consciously; `no-room` means the Day has no quarter-hour left.
export type PlanBlockDraftProposal =
  { kind: 'window'; startAt: number; endAt: number } | { kind: 'blank' } | { kind: 'no-room' }

export function planBlockDraftProposal({
  dayStart,
  dayEnd,
  now,
  planBlocks,
  lengthMs = DEFAULT_PLAN_BLOCK_LENGTH_MS,
}: {
  dayStart: number
  dayEnd: number
  now: number
  planBlocks: { plannedStart: number; plannedEnd: number }[]
  lengthMs?: number
}): PlanBlockDraftProposal {
  const startAt = planFloor(dayStart, now)
  if (startAt >= dayEnd) return { kind: 'no-room' }

  const endAt = Math.min(startAt + lengthMs, dayEnd)
  if (endAt - startAt < PLAN_BLOCK_GRAIN_MS) return { kind: 'no-room' }

  const overlaps = planBlocks.some((plan) => startAt < plan.plannedEnd && endAt > plan.plannedStart)
  return overlaps ? { kind: 'blank' } : { kind: 'window', startAt, endAt }
}

// The first grain at or after `now`, inside the planBlock's Day.
export function planFloor(dayStart: number, now: number): number {
  return (
    dayStart + Math.max(0, Math.ceil((now - dayStart) / PLAN_BLOCK_GRAIN_MS)) * PLAN_BLOCK_GRAIN_MS
  )
}
