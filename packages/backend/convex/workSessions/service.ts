import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import type {
  DashboardMember,
  DashboardPartial,
  DashboardWorkSession,
  WorkSessionTaskSource,
} from './types'
import { hasViewer } from '../auth/service'
import { taskPlansForDay } from '../tasks/service'
import { pickNowTask } from '../tasks/util'
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

// One card per member for the dashboard: one Day's workSessions and partials,
// grouped. Returns raw timestamps only — the client derives live durations and
// totals against its own clock (see ./util). `dayStart` (epoch ms) is passed by
// the caller because queries must not read the wall clock. `todayStart` lets the
// caller say whether `dayStart` is the live Day: only then do still-running
// sessions join the window, so a closed Day cannot borrow today's activity.
export async function getTodaysActivitiesForDashboard(
  ctx: QueryCtx,
  dayStart: number,
  todayStart: number = dayStart,
  now: number = todayStart
): Promise<DashboardMember[]> {
  if (!(await hasViewer(ctx))) return []
  const isToday = dayStart === todayStart
  const members = await groupDayMembers(ctx, dayStart, isToday)
  const withTasks = await attachDayTasks(ctx, members, dayStart, isToday, now)
  return await attachDayPlanBlocks(ctx, withTasks, dayStart)
}

// The live "today" read the room rail and the leaderboard keep using.
export async function groupTodaysMembers(
  ctx: QueryCtx,
  dayStart: number
): Promise<DashboardMember[]> {
  return await groupDayMembers(ctx, dayStart, true)
}

// The shared day-window read, without any auth: everyone who studied during
// [dayStart, dayEnd), grouped workSession → member. The upper bound is load
// bearing: without it, asking for a past Day also returns every Day after it.
// `includeRunning` adds sessions still running now — they may have started
// before midnight and are part of the live picture, but they never belong to a
// closed Day.
export async function groupDayMembers(
  ctx: QueryCtx,
  dayStart: number,
  includeRunning: boolean
): Promise<DashboardMember[]> {
  const dayEnd = nextDayStart(dayStart, DASHBOARD_TIME_ZONE)
  const [dayPartials, runningPartials] = await Promise.all([
    ctx.db
      .query('workSessionPartial')
      .withIndex('by_startedAt', (q) => q.gte('startedAt', dayStart).lt('startedAt', dayEnd))
      .take(MAX_TODAY_PARTIALS),
    includeRunning
      ? ctx.db
          .query('workSessionPartial')
          .withIndex('by_status', (q) => q.eq('status', 'active'))
          .take(MAX_ACTIVE_PARTIALS)
      : Promise.resolve<Doc<'workSessionPartial'>[]>([]),
  ])

  return await groupPartials(ctx, [...dayPartials, ...runningPartials])
}

// One member's live Day, for reads that only need the caller's own row (the
// calendar's today cell). Same grouping rules as `groupDayMembers`, but scoped
// by userId so it never scans or groups the whole room.
export async function getMemberToday(
  ctx: QueryCtx,
  user: Doc<'users'>,
  todayStart: number
): Promise<DashboardMember | null> {
  const dayEnd = nextDayStart(todayStart, DASHBOARD_TIME_ZONE)
  const [dayPartials, runningPartials] = await Promise.all([
    ctx.db
      .query('workSessionPartial')
      .withIndex('by_userId', (q) =>
        q.eq('userId', user._id).gte('startedAt', todayStart).lt('startedAt', dayEnd)
      )
      .take(MAX_TODAY_PARTIALS),
    ctx.db
      .query('workSessionPartial')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .take(MAX_ACTIVE_PARTIALS),
  ])
  const runningMine = runningPartials.filter((partial) => partial.userId === user._id)
  return (await groupPartials(ctx, [...dayPartials, ...runningMine]))[0] ?? null
}

// Group a set of partials into member cards. Shared by the full-day read and the
// single-member live read so the key and ordering rules cannot drift.
async function groupPartials(
  ctx: QueryCtx,
  input: Doc<'workSessionPartial'>[]
): Promise<DashboardMember[]> {
  const byId = new Map<Id<'workSessionPartial'>, Doc<'workSessionPartial'>>()
  for (const partial of input) byId.set(partial._id, partial)
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
  dayStart: number,
  isToday: boolean,
  now: number
): Promise<DashboardMember[]> {
  const dayEnd = nextDayStart(dayStart, DASHBOARD_TIME_ZONE)

  return await Promise.all(
    members.map(async (member) => {
      const userId = member.userId
      if (!userId) return member

      const [planned, completed, plans] = await Promise.all([
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
        taskPlansForDay(ctx, userId, dayStart),
      ])

      // A task planned and finished today arrives from both reads; keep one row.
      const byId = new Map(planned.map((task) => [task._id, task]))
      for (const task of completed) byId.set(task._id, task)
      const sources: WorkSessionTaskSource[] = [...byId.values()].map(toWorkSessionTaskSource)

      // Now is the live plan's first Open task, else the unscheduled queue, then
      // the earliest upcoming plan (ST-35). Derived from the same tasks and
      // assignments the board reads, never a stored pointer; a past or future
      // Day has no Now.
      const nowTask = isToday ? pickNowTask(planned, plans, now) : null
      const activeTask = nowTask ? { id: nowTask._id, title: nowTask.title } : null
      if (sources.length === 0) return { ...member, activeTask }

      return {
        ...member,
        activeTask,
        workSessions: attachTasksToWorkSessions(member.workSessions, sources),
      }
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

    member.planBlocks.push({
      id: plan._id,
      title: plan.title ?? null,
      startAt: plan.plannedStart,
      endAt: plan.plannedEnd,
    })
  }

  for (const member of result) {
    member.planBlocks.sort((a, b) => a.startAt - b.startAt)
  }

  return result
}

function toWorkSessionTaskSource(task: Doc<'task'>): WorkSessionTaskSource {
  return {
    id: task._id,
    title: task.title,
    completedAt: task.completedAt ?? null,
  }
}
