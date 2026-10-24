import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import type {
  DashboardMember,
  DashboardPartial,
  DashboardWorkSession,
  WorkSessionTaskSource,
} from './types'
import { attachTasksToWorkSessions, DASHBOARD_TIME_ZONE, nextDayStart } from './util'

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000

// Bounded reads: a day of activity sits far below these. They exist only so
// neither query can scan the table without a cap.
const MAX_TODAY_PARTIALS = 1000
const MAX_ACTIVE_PARTIALS = 500
const MAX_TASKS_PER_MEMBER = 200
const MAX_PLANS_PER_DAY = 500

// Everyone currently in a study channel. Live — the dashboard subscribes to it.
export async function listActive(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return []
  return await ctx.db
    .query('workSessionPartial')
    .withIndex('by_status', (q) => q.eq('status', 'active'))
    .collect()
}

// Most recent finished/active partials, newest first.
export async function listRecent(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return []
  return await ctx.db.query('workSessionPartial').order('desc').take(25)
}

// One card per member for the dashboard: their whole day's workSessions and partials,
// grouped. Returns raw timestamps only — the client derives live durations and
// totals against its own clock (see ./util). `dayStart` (epoch ms) is passed by
// the caller because queries must not read the wall clock; it stays stable for
// the whole day, so the subscription does not churn.
export async function getTodaysActivitiesForDashboard(
  ctx: QueryCtx,
  dayStart: number
): Promise<DashboardMember[]> {
  // DEV: the dev deployment sets DEV_AUTH_BYPASS (packages/backend/.env.local,
  // synced by `npx convex dev`) so /beta can be worked on signed-out. Prod never
  // has it and keeps the identity gate.
  if (process.env.DEV_AUTH_BYPASS !== '1') {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
  }
  const members = await groupTodaysMembers(ctx, dayStart)
  const withTasks = await attachDayTasks(ctx, members, dayStart)
  const withPlanBlocks = await attachDayPlanBlocks(ctx, withTasks, dayStart)
  return await attachActiveTasks(ctx, withPlanBlocks)
}

// The shared day-window read, without any auth: everyone who studied today (or is
// still running), grouped workSession → member. Both the dashboard query above and the
// bot leaderboard build on this; the caller decides who may read it.
export async function groupTodaysMembers(
  ctx: QueryCtx,
  dayStart: number
): Promise<DashboardMember[]> {
  // A partial belongs to today if it started today, or is still running — the
  // latter may have started before midnight and is part of the live picture.
  const [today, active] = await Promise.all([
    ctx.db
      .query('workSessionPartial')
      .withIndex('by_startedAt', (q) => q.gte('startedAt', dayStart))
      .take(MAX_TODAY_PARTIALS),
    ctx.db
      .query('workSessionPartial')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .take(MAX_ACTIVE_PARTIALS),
  ])

  const byId = new Map<Id<'workSessionPartial'>, Doc<'workSessionPartial'>>()
  for (const partial of [...today, ...active]) byId.set(partial._id, partial)
  const partials = [...byId.values()]

  // Group partials under their workSession, then workSessions under their member.
  const partialsByWorkSession = new Map<Id<'workSession'>, Doc<'workSessionPartial'>[]>()
  for (const partial of partials) {
    const list = partialsByWorkSession.get(partial.workSessionId) ?? []
    list.push(partial)
    partialsByWorkSession.set(partial.workSessionId, list)
  }

  const workSessionsByMember = new Map<string, DashboardWorkSession[]>()
  const userByMember = new Map<string, Id<'users'> | null>()

  for (const [workSessionId, workSessionPartials] of partialsByWorkSession) {
    const workSession = await ctx.db.get(workSessionId)
    if (!workSession) continue

    // Manual workSessions have no Discord id, so a member is keyed by their user row
    // when needed and only falls back to the workSession id in the impossible case.
    const memberKey =
      workSession.discordId ?? (workSession.userId ? String(workSession.userId) : workSessionId)
    const list = workSessionsByMember.get(memberKey) ?? []
    list.push(buildWorkSession(workSession, workSessionPartials))
    workSessionsByMember.set(memberKey, list)
    if (!userByMember.has(memberKey)) {
      const userId = workSession.userId ?? workSessionPartials.find((p) => p.userId)?.userId ?? null
      userByMember.set(memberKey, userId ?? null)
    }
  }

  const members: DashboardMember[] = []
  for (const [memberKey, workSessions] of workSessionsByMember) {
    const userId = userByMember.get(memberKey) ?? null
    const user = userId ? await ctx.db.get(userId) : null
    workSessions.sort((a, b) => b.startedAt - a.startedAt)
    members.push({
      userId,
      discordId: memberKey,
      name: user?.name ?? null,
      image: user?.image ?? null,
      online: workSessions.some((s) => s.status === 'active'),
      workSessions,
      planBlocks: [],
      activeTask: null,
    })
  }

  return members
}

// Safety net: a forgotten workSession (e.g. the bot restarted while someone was
// connected) is closed after 8 hours instead of counting forever. Ends both the
// stale partial and the workSession it belongs to.
export async function closeStale(ctx: MutationCtx) {
  const now = Date.now()
  const active = await ctx.db
    .query('workSessionPartial')
    .withIndex('by_status', (q) => q.eq('status', 'active'))
    .collect()

  let closed = 0
  for (const partial of active) {
    if (now - partial.startedAt > EIGHT_HOURS_MS) {
      await ctx.db.patch(partial._id, {
        status: 'ended',
        endedAt: now,
        durationMs: now - partial.startedAt,
      })
      await ctx.db.patch(partial.workSessionId, { status: 'ended', endedAt: now })
      closed += 1
    }
  }
  return closed
}

function buildWorkSession(
  workSession: Doc<'workSession'>,
  partials: Doc<'workSessionPartial'>[]
): DashboardWorkSession {
  return {
    id: workSession._id,
    status: workSession.status,
    startedAt: workSession.startedAt,
    endedAt: workSession.endedAt ?? null,
    partials: partials.map(toDashboardPartial).sort((a, b) => b.startedAt - a.startedAt),
    tasks: [],
  }
}

function toDashboardPartial(partial: Doc<'workSessionPartial'>): DashboardPartial {
  return {
    id: partial._id,
    channelId: partial.channelId ?? null,
    mode: partial.mode,
    startedAt: partial.startedAt,
    endedAt: partial.endedAt ?? null,
  }
}

// Bind each member's Day tasks to their workSessions. Two indexed reads replace the
// old newest-first scan: the Day's plan (by `plannedAt`) and the Day's completions
// (by `completedAt`), so an old task finished today still shows. Both are bounded;
// task content is public, so titles ride along (ADR-0007).
async function attachDayTasks(
  ctx: QueryCtx,
  members: DashboardMember[],
  dayStart: number
): Promise<DashboardMember[]> {
  const dayEnd = nextDayStart(dayStart, DASHBOARD_TIME_ZONE)

  return await Promise.all(
    members.map(async (member) => {
      const userId = member.userId
      if (!userId) return member

      const [planned, completed] = await Promise.all([
        ctx.db
          .query('task')
          .withIndex('by_userId_plannedAt', (q) => q.eq('userId', userId).eq('plannedAt', dayStart))
          .order('desc')
          .take(MAX_TASKS_PER_MEMBER),
        ctx.db
          .query('task')
          .withIndex('by_userId_completedAt', (q) =>
            q.eq('userId', userId).gte('completedAt', dayStart).lt('completedAt', dayEnd)
          )
          .order('desc')
          .take(MAX_TASKS_PER_MEMBER),
      ])

      // A task planned and finished today arrives from both reads; keep one row.
      const byId = new Map(planned.map((task) => [task._id, task]))
      for (const task of completed) byId.set(task._id, task)
      const sources: WorkSessionTaskSource[] = [...byId.values()].map(toWorkSessionTaskSource)
      if (sources.length === 0) return member

      return { ...member, workSessions: attachTasksToWorkSessions(member.workSessions, sources) }
    })
  )
}

// Attach each member's planBlocks for the Day. planBlocks are public (ADR-0007)
// and are not workSessions, so one with no partials must still get a card:
// members not produced by the partial-first grouping are appended as offline
// stubs. A member may have several planBlocks; each one gets an entry.
async function attachDayPlanBlocks(
  ctx: QueryCtx,
  members: DashboardMember[],
  dayStart: number
): Promise<DashboardMember[]> {
  const planBlocks = await ctx.db
    .query('planBlock')
    .withIndex('by_dayStart', (q) => q.eq('dayStart', dayStart))
    .take(MAX_PLANS_PER_DAY)
  if (planBlocks.length === 0) return members

  const result = members.map((member) => ({ ...member }))
  const byUser = new Map<string, DashboardMember>()
  for (const member of result) {
    if (member.userId) byUser.set(String(member.userId), member)
  }

  for (const plan of planBlocks) {
    const key = String(plan.userId)
    let member = byUser.get(key)
    if (!member) {
      const user = await ctx.db.get(plan.userId)
      member = {
        userId: plan.userId,
        discordId: user?.discordId ?? key,
        name: user?.name ?? null,
        image: user?.image ?? null,
        online: false,
        workSessions: [],
        planBlocks: [],
        activeTask: null,
      }
      result.push(member)
      byUser.set(key, member)
    }

    member.planBlocks.push({ id: plan._id, startAt: plan.plannedStart, endAt: plan.plannedEnd })
  }

  for (const member of result) {
    member.planBlocks.sort((a, b) => a.startAt - b.startAt)
  }

  return result
}

// Give every member their NOW task from the user-level pointer. Kept out of
// groupTodaysMembers because the bot's leaderboard reads that helper and has no
// use for the pointer.
async function attachActiveTasks(
  ctx: QueryCtx,
  members: DashboardMember[]
): Promise<DashboardMember[]> {
  return await Promise.all(
    members.map(async (member) => {
      if (!member.userId) return member
      const user = await ctx.db.get(member.userId)
      if (!user?.activeTaskId) return member

      const task = await ctx.db.get(user.activeTaskId)
      if (!task || task.userId !== user._id) return member

      return { ...member, activeTask: { id: task._id, title: task.title } }
    })
  )
}

function toWorkSessionTaskSource(task: Doc<'task'>): WorkSessionTaskSource {
  return {
    id: task._id,
    title: task.title,
    createdAt: task._creationTime,
    plannedWorkSessionId: task.plannedWorkSessionId ?? null,
    completedAt: task.completedAt ?? null,
  }
}
