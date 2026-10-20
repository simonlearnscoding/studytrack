import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import type {
  DashboardMember,
  DashboardPartial,
  DashboardSession,
  SessionTaskSource,
} from './types'
import { attachTasksToSessions, DASHBOARD_TIME_ZONE, nextDayStart } from './util'

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
    .query('sessionPartial')
    .withIndex('by_status', (q) => q.eq('status', 'active'))
    .collect()
}

// Most recent finished/active partials, newest first.
export async function listRecent(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return []
  return await ctx.db.query('sessionPartial').order('desc').take(25)
}

// One card per member for the dashboard: their whole day's sessions and partials,
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
  return await attachDayPlans(ctx, withTasks, dayStart)
}

// The shared day-window read, without any auth: everyone who studied today (or is
// still running), grouped session → member. Both the dashboard query above and the
// bot leaderboard build on this; the caller decides who may read it.
export async function groupTodaysMembers(
  ctx: QueryCtx,
  dayStart: number
): Promise<DashboardMember[]> {
  // A partial belongs to today if it started today, or is still running — the
  // latter may have started before midnight and is part of the live picture.
  const [today, active] = await Promise.all([
    ctx.db
      .query('sessionPartial')
      .withIndex('by_startedAt', (q) => q.gte('startedAt', dayStart))
      .take(MAX_TODAY_PARTIALS),
    ctx.db
      .query('sessionPartial')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .take(MAX_ACTIVE_PARTIALS),
  ])

  const byId = new Map<Id<'sessionPartial'>, Doc<'sessionPartial'>>()
  for (const partial of [...today, ...active]) byId.set(partial._id, partial)
  const partials = [...byId.values()]

  // Group partials under their session, then sessions under their member.
  const partialsBySession = new Map<Id<'session'>, Doc<'sessionPartial'>[]>()
  for (const partial of partials) {
    const list = partialsBySession.get(partial.sessionId) ?? []
    list.push(partial)
    partialsBySession.set(partial.sessionId, list)
  }

  const sessionsByMember = new Map<string, DashboardSession[]>()
  const userByMember = new Map<string, Id<'users'> | null>()

  for (const [sessionId, sessionPartials] of partialsBySession) {
    const session = await ctx.db.get(sessionId)
    if (!session) continue

    // Manual sessions have no Discord id, so a member is keyed by their user row
    // when needed and only falls back to the session id in the impossible case.
    const memberKey = session.discordId ?? (session.userId ? String(session.userId) : sessionId)
    const list = sessionsByMember.get(memberKey) ?? []
    list.push(buildSession(session, sessionPartials))
    sessionsByMember.set(memberKey, list)
    if (!userByMember.has(memberKey)) {
      const userId = session.userId ?? sessionPartials.find((p) => p.userId)?.userId ?? null
      userByMember.set(memberKey, userId ?? null)
    }
  }

  const members: DashboardMember[] = []
  for (const [memberKey, sessions] of sessionsByMember) {
    const userId = userByMember.get(memberKey) ?? null
    const user = userId ? await ctx.db.get(userId) : null
    sessions.sort((a, b) => b.startedAt - a.startedAt)
    members.push({
      userId,
      discordId: memberKey,
      name: user?.name ?? null,
      image: user?.image ?? null,
      online: sessions.some((s) => s.status === 'active'),
      sessions,
      plan: null,
    })
  }

  return members
}

// Safety net: a forgotten session (e.g. the bot restarted while someone was
// connected) is closed after 8 hours instead of counting forever. Ends both the
// stale partial and the session it belongs to.
export async function closeStale(ctx: MutationCtx) {
  const now = Date.now()
  const active = await ctx.db
    .query('sessionPartial')
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
      await ctx.db.patch(partial.sessionId, { status: 'ended', endedAt: now })
      closed += 1
    }
  }
  return closed
}

function buildSession(
  session: Doc<'session'>,
  partials: Doc<'sessionPartial'>[]
): DashboardSession {
  return {
    id: session._id,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt ?? null,
    partials: partials.map(toDashboardPartial).sort((a, b) => b.startedAt - a.startedAt),
    tasks: [],
  }
}

function toDashboardPartial(partial: Doc<'sessionPartial'>): DashboardPartial {
  return {
    id: partial._id,
    channelId: partial.channelId ?? null,
    mode: partial.mode,
    startedAt: partial.startedAt,
    endedAt: partial.endedAt ?? null,
  }
}

// Bind each member's Day tasks to their sessions. Two indexed reads replace the
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
      const sources: SessionTaskSource[] = [...byId.values()].map(toSessionTaskSource)
      if (sources.length === 0) return member

      return { ...member, sessions: attachTasksToSessions(member.sessions, sources) }
    })
  )
}

// Attach each member's planned session for the Day. Plans are public (ADR-0007)
// and are not Sessions, so a plan with no partials must still get a card:
// members not produced by the partial-first grouping are appended as offline
// stubs. A member has at most one plan, so a direct map is enough.
async function attachDayPlans(
  ctx: QueryCtx,
  members: DashboardMember[],
  dayStart: number
): Promise<DashboardMember[]> {
  const plans = await ctx.db
    .query('plannedSession')
    .withIndex('by_dayStart', (q) => q.eq('dayStart', dayStart))
    .take(MAX_PLANS_PER_DAY)
  if (plans.length === 0) return members

  const result = members.map((member) => ({ ...member }))
  const byUser = new Map<string, DashboardMember>()
  for (const member of result) {
    if (member.userId) byUser.set(String(member.userId), member)
  }

  for (const plan of plans) {
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
        sessions: [],
        plan: null,
      }
      result.push(member)
      byUser.set(key, member)
    }

    member.plan = { id: plan._id, startAt: plan.plannedStart, endAt: plan.plannedEnd }
  }

  return result
}

function toSessionTaskSource(task: Doc<'task'>): SessionTaskSource {
  return {
    id: task._id,
    title: task.title,
    createdAt: task._creationTime,
    plannedSessionId: task.plannedSessionId ?? null,
    completedAt: task.completedAt ?? null,
  }
}
