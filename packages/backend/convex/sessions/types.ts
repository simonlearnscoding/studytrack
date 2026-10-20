import type { Id } from '../_generated/dataModel'
import type { StudyMode } from '../bot/types'

// A partial atom on the dashboard: one stretch of constant voice state. Breaks
// are included (mode `break`) so the client can draw the gaps, but they carry no
// study time. Durations are not sent — the client derives them from these
// timestamps against its own ticking clock (see ./util).
export type DashboardPartial = {
  id: Id<'sessionPartial'>
  channelId: string | null
  mode: StudyMode
  startedAt: number
  // null while the partial is still running.
  endedAt: number | null
}

// A task a session should show, exposed to the room (ADR-0007: task content is
// public). `planned` marks an explicit plan into this session; `completedAt` is
// scoped to this session and stays null for a planned-only entry, even when the
// task is Done elsewhere.
export type DashboardSessionTask = {
  id: Id<'task'>
  title: string
  planned: boolean
  completedAt: number | null
}

// The task facts the session union needs from the Day reads: the explicit plan
// link, the completion instant, and creation order for planned entries.
export type SessionTaskSource = {
  id: Id<'task'>
  title: string
  createdAt: number
  plannedSessionId: Id<'session'> | null
  completedAt: number | null
}

// One sitting belonging to a member today.
export type DashboardSession = {
  id: Id<'session'>
  status: 'active' | 'ended'
  startedAt: number
  endedAt: number | null
  partials: DashboardPartial[]
  // The deduped union of tasks planned into and finished in this session (see
  // ./util). Each task appears at most once.
  tasks: DashboardSessionTask[]
}

// A member's one planned session for the Day: a future block on their lane.
// Public like tasks (ADR-0007), and not a Session — no voice evidence.
export type DashboardPlan = {
  id: Id<'plannedSession'>
  startAt: number
  endAt: number
}

// One card on the dashboard: a person's whole day.
export type DashboardMember = {
  userId: Id<'users'> | null
  discordId: string
  // Profile fields are null when the Discord row was never linked to Clerk; the
  // client falls back to `discordId` for the name.
  name: string | null
  image: string | null
  // Currently in a study channel (has an active session). Derived from data, not
  // the clock.
  online: boolean
  sessions: DashboardSession[]
  // The member's planned session for this Day, or null. A plan is public, so it
  // rides on every member's card, even when they have no Sessions today.
  plan: DashboardPlan | null
}
