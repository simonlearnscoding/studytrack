import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import type {
  DashboardCompletedTask,
  DashboardMember,
  DashboardPartial,
  DashboardSession,
} from './types'
import { attachTasksToSessions } from './util'

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000

// Bounded reads: a day of activity sits far below these. They exist only so
// neither query can scan the table without a cap.
const MAX_TODAY_PARTIALS = 1000
const MAX_ACTIVE_PARTIALS = 500
const MAX_TASKS_PER_MEMBER = 200

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
  return await attachCompletedTasks(ctx, members)
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

// Bind each member's completed tasks to the session they were finished during.
// Only done tasks carry a `completedAt` to bind with; open tasks never appear.
// The read is newest-first and bounded so today's completions survive a long
// history; task content is public, so the title rides along (ADR-0007).
async function attachCompletedTasks(
  ctx: QueryCtx,
  members: DashboardMember[]
): Promise<DashboardMember[]> {
  return await Promise.all(
    members.map(async (member) => {
      const userId = member.userId
      if (!userId) return member

      const tasks = await ctx.db
        .query('task')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .order('desc')
        .take(MAX_TASKS_PER_MEMBER)

      const completed: DashboardCompletedTask[] = tasks.flatMap((task) =>
        task.done && task.completedAt !== undefined
          ? [{ id: task._id, title: task.title, completedAt: task.completedAt }]
          : []
      )
      if (completed.length === 0) return member

      return { ...member, sessions: attachTasksToSessions(member.sessions, completed) }
    })
  )
}
