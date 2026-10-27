import type { PlanBlockTask, PlanTaskStats } from './types'

// Where a plan block sits relative to the caller's clock. Derived, never stored:
// a flag would go stale the moment the clock crossed the boundary (ADR-0012).
export type PlanPhase = 'upcoming' | 'live' | 'past'

export function planPhase(plannedStart: number, plannedEnd: number, now: number): PlanPhase {
  if (now < plannedStart) return 'upcoming'
  if (now < plannedEnd) return 'live'
  return 'past'
}

// What the workSession header's left slot says while the member is tracking.
// Derived from the covering block, never stored: a session has no planned end of
// its own, so the only end time that exists is the block's.
export type PlanCountdown =
  | {
      kind: 'live'
      startsAt: number
      endsAt: number
      leftMs: number
      drained: number
      tone: CountdownTone
    }
  | { kind: 'upcoming'; startsAt: number; untilMs: number }
  | { kind: 'none' }

// How loudly the clock should read. The lead is relative to the block, not
// absolute: ten fixed minutes would make a 15-minute block low for two thirds of
// its life. One step only — the ring shifts colour, the number never does.
export type CountdownTone = 'normal' | 'low'

const LOW_LEAD_MS = 10 * 60 * 1000

export function countdownTone(leftMs: number, spanMs: number): CountdownTone {
  return leftMs <= Math.min(LOW_LEAD_MS, spanMs / 4) ? 'low' : 'normal'
}

// Time left in the block that covers `now`, else the wait until the Day's next
// block, else nothing. `blocks` is one Day's, so a header can never count down
// to tomorrow; the half-open window means the instant a block ends belongs to
// the next one, and touching blocks never both read as live.
export function planCountdown(
  blocks: { plannedStart: number; plannedEnd: number }[],
  now: number
): PlanCountdown {
  let next: { plannedStart: number; plannedEnd: number } | null = null
  for (const block of blocks) {
    const phase = planPhase(block.plannedStart, block.plannedEnd, now)
    if (phase === 'live') {
      const span = block.plannedEnd - block.plannedStart
      return {
        kind: 'live',
        startsAt: block.plannedStart,
        endsAt: block.plannedEnd,
        leftMs: block.plannedEnd - now,
        // How much of the block's window is gone: what a dial draws. Clamped so
        // a block with no span (or a clock oddity) never yields NaN.
        drained: span <= 0 ? 0 : Math.min(1, Math.max(0, (now - block.plannedStart) / span)),
        tone: countdownTone(block.plannedEnd - now, span),
      }
    }
    if (phase === 'upcoming' && (next === null || block.plannedStart < next.plannedStart)) {
      next = block
    }
  }
  if (next === null) return { kind: 'none' }
  return { kind: 'upcoming', startsAt: next.plannedStart, untilMs: next.plannedStart - now }
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
