import type { Doc, Id } from '../_generated/dataModel'
import type {
  NowCandidates,
  NowPlanCandidate,
  NowTaskCandidate,
  Task,
  TaskPlacement,
  TaskPlan,
} from './types'

// The up-next suggestion, derived from an oldest-first Day list. It is the first
// Open task below the active row, or the first Open task when nothing is active.
// It never wraps back to the top and never starts anything by itself.
export function pickUpNext(tasks: Task[], activeTaskId: Id<'task'> | null): Task | null {
  const activeIndex = activeTaskId ? tasks.findIndex((task) => task.id === activeTaskId) : -1
  for (let i = activeIndex + 1; i < tasks.length; i++) {
    if (!tasks[i].done) return tasks[i]
  }
  return null
}

// The manual order of a Day. `position` is authoritative; tasks written before
// the field existed (or before the backfill ran) keep creation order, after the
// positioned ones. Ties fall back to the creation instant.
export function byPosition(a: Doc<'task'>, b: Doc<'task'>): number {
  if (a.position !== undefined && b.position !== undefined && a.position !== b.position) {
    return a.position - b.position
  }
  if (a.position !== undefined && b.position === undefined) return -1
  if (a.position === undefined && b.position !== undefined) return 1
  return a._creationTime - b._creationTime
}

// The displayed order of a Day: Open tasks first, Done tasks after, each group in
// manual position order. Checking a task therefore drops it to the bottom without
// rewriting its position, so reopening returns it to its place.
export function byQueueOrder(a: Doc<'task'>, b: Doc<'task'>): number {
  if (a.done !== b.done) return a.done ? 1 : -1
  return byPosition(a, b)
}

// The Done group reads as a log: the first task ticked that Day sits on top and
// the newest sinks to the bottom. A retrospective tick carries no instant
// (ADR-0010), so it cannot be placed in time and keeps its queue order below the
// timed ones.
export function byCompletionOrder(a: Task, b: Task): number {
  if (a.completedAt === b.completedAt) return 0
  if (a.completedAt === null) return 1
  if (b.completedAt === null) return -1
  return a.completedAt - b.completedAt
}

// The window a task's current plan contributes to Now. `TaskPlan` carries the
// title too, but Now only needs the block's identity and bounds.
export type TaskPlanWindow = Pick<TaskPlan, 'planBlockId' | 'plannedStart' | 'plannedEnd'>

// Now under plan groups (ST-35, ADR-0014): the live plan leads, then the
// unscheduled queue, then the earliest upcoming plan. "Unscheduled" includes a
// task whose latest plan has already ended: that block is the record, not a live
// group. Every branch reads the same queue order, so reordering inside the live
// group changes what the member is on.
//
// The compact form lets a ticking client pick Now from a stable read: it ships
// each plan's first Open task plus the first Open task with no plan, and the
// client compares them against its own clock. The server builds it without a
// clock, so the query never re-subscribes just because time passed.
export function buildNowCandidates(
  tasks: Doc<'task'>[],
  plans: Map<Id<'task'>, TaskPlanWindow>
): NowCandidates {
  // Queue order is the tie-breaker everywhere; `order` carries it across the wire.
  const open = [...tasks].filter((task) => !task.done).sort(byQueueOrder)
  const ordered = open.map((task, order) => ({
    task,
    candidate: { id: task._id, title: task.title, order } satisfies NowTaskCandidate,
  }))

  const unplanned = ordered.find(({ task }) => !plans.has(task._id))?.candidate ?? null
  const byPlan = new Map<Id<'planBlock'>, NowPlanCandidate>()
  for (const { task, candidate } of ordered) {
    const plan = plans.get(task._id)
    if (!plan || byPlan.has(plan.planBlockId)) continue
    byPlan.set(plan.planBlockId, {
      plannedStart: plan.plannedStart,
      plannedEnd: plan.plannedEnd,
      firstOpenTask: candidate,
    })
  }

  return {
    unplanned,
    plans: [...byPlan.values()].sort((a, b) => a.plannedStart - b.plannedStart),
  }
}

// The clock-dependent half: run this in render, not in the query key.
export function pickNowCandidate(candidates: NowCandidates, now: number): NowTaskCandidate | null {
  const live = candidates.plans.find((plan) => plan.plannedStart <= now && plan.plannedEnd > now)
  if (live) return live.firstOpenTask

  const unscheduled = [
    candidates.unplanned,
    ...candidates.plans.filter((plan) => plan.plannedEnd <= now).map((plan) => plan.firstOpenTask),
  ].filter((task): task is NowTaskCandidate => task !== null)
  if (unscheduled.length > 0) {
    return unscheduled.reduce((first, task) => (task.order < first.order ? task : first))
  }

  return candidates.plans.find((plan) => plan.plannedStart > now)?.firstOpenTask ?? null
}

// Where a new Open task lands in a Day already in queue order. `now` goes to the
// very top (the first Open task is Now), `next` right after the current Now, and
// `end` at the bottom. An empty Day accepts every placement at index 0.
export function insertionIndex(tasks: Doc<'task'>[], placement: TaskPlacement): number {
  if (placement === 'end') return tasks.length
  if (placement === 'now') return 0
  return tasks.some((task) => !task.done) ? 1 : 0
}

// The final Day order after a drag: the ids the caller sent, in that order, then
// every other task of the Day in its current order. Extra tasks (added on another
// device mid-drag) are kept instead of failing the write.
export function planOrder(tasks: Doc<'task'>[], orderedIds: Id<'task'>[]): Doc<'task'>[] {
  const byId = new Map(tasks.map((task) => [task._id, task]))
  const ordered: Doc<'task'>[] = []
  for (const id of orderedIds) {
    const task = byId.get(id)
    if (!task) throw new Error('Task not found')
    ordered.push(task)
  }
  const sent = new Set(orderedIds)
  return [...ordered, ...tasks.filter((task) => !sent.has(task._id))]
}
