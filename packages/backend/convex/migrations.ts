import { internalMutation } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { DASHBOARD_TIME_ZONE, startOfDay } from './workSessions/util'

// One-off ST-27 migration: tasks created before `plannedAt` existed are planned
// for the Europe/Zurich Day of their creation instant. Idempotent; safe to rerun.
// Run while `plannedAt` is temporarily optional, then restore the required schema.
export const backfillTaskPlannedAt = internalMutation({
  args: {},
  handler: async (ctx) => {
    let patched = 0
    for await (const task of ctx.db.query('task')) {
      if (Object.hasOwn(task, 'plannedAt')) continue
      await ctx.db.patch(task._id, {
        plannedAt: startOfDay(task._creationTime, DASHBOARD_TIME_ZONE),
      })
      patched += 1
    }
    return { patched }
  },
})

// One-off ST-38 migration: the Task's plan moves from the planAssignment table to
// `task.planBlockId` (ADR-0015). Copies the assignment to a block that has not
// ended, else the newest one, so a task that was planned ahead keeps its block.
// Idempotent; safe to rerun. Run while planAssignment is still in the schema, then
// ship its removal.
export const backfillTaskPlanBlockId = internalMutation({
  args: {},
  handler: async (ctx) => {
    let patched = 0
    for await (const task of ctx.db.query('task')) {
      if (task.planBlockId !== undefined) continue

      const assignments = await ctx.db
        .query('planAssignment')
        .withIndex('by_taskId', (q) => q.eq('taskId', task._id))
        .collect()
      let current: { planBlockId: Id<'planBlock'>; plannedEnd: number } | null = null
      for (const assignment of assignments) {
        const block = await ctx.db.get(assignment.planBlockId)
        if (!block) continue
        if (!current || block.plannedEnd > current.plannedEnd) {
          current = { planBlockId: block._id, plannedEnd: block.plannedEnd }
        }
      }
      if (!current) continue

      await ctx.db.patch(task._id, { planBlockId: current.planBlockId })
      patched += 1
    }
    return { patched }
  },
})

// One-off ST-29 migration: give every task of a (member, Day) its position in
// creation order, so the list reads exactly as it did before manual ordering.
// Idempotent; safe to rerun.
export const backfillTaskPositions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const days = new Map<string, Doc<'task'>[]>()
    for await (const task of ctx.db.query('task')) {
      const key = `${task.userId}:${task.plannedAt}`
      const group = days.get(key)
      if (group) group.push(task)
      else days.set(key, [task])
    }

    let patched = 0
    for (const tasks of days.values()) {
      tasks.sort((a, b) => a._creationTime - b._creationTime)
      for (const [index, task] of tasks.entries()) {
        if (task.position === index) continue
        await ctx.db.patch(task._id, { position: index })
        patched += 1
      }
    }
    return { patched }
  },
})
