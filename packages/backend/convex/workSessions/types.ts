import type { Id } from '../_generated/dataModel'
import type { StudyMode } from '../bot/types'

// A partial atom on the dashboard: one stretch of constant voice state. Breaks
// are included (mode `break`) so the client can draw the gaps, but they carry no
// study time. Durations are not sent — the client derives them from these
// timestamps against its own ticking clock (see ./util).
export type DashboardPartial = {
  id: Id<'workSessionPartial'>
  channelId: string | null
  mode: StudyMode
  startedAt: number
  // null while the partial is still running.
  endedAt: number | null
}

// A task a workSession should show, exposed to the room (ADR-0007: task content is
// public). `planned` marks an explicit plan into this workSession; `completedAt` is
// scoped to this workSession and stays null for a planned-only entry, even when the
// task is Done elsewhere.
export type DashboardWorkSessionTask = {
  id: Id<'task'>
  title: string
  planned: boolean
  completedAt: number | null
}

// The task facts the workSession union needs from the Day reads: the explicit plan
// link, the completion instant, and creation order for planned entries.
export type WorkSessionTaskSource = {
  id: Id<'task'>
  title: string
  createdAt: number
  plannedWorkSessionId: Id<'workSession'> | null
  completedAt: number | null
}

// One sitting belonging to a member today.
export type DashboardWorkSession = {
  id: Id<'workSession'>
  status: 'active' | 'ended'
  startedAt: number
  endedAt: number | null
  partials: DashboardPartial[]
  // The deduped union of tasks planned into and finished in this workSession (see
  // ./util). Each task appears at most once.
  tasks: DashboardWorkSessionTask[]
}

// A member's planned workSession for the Day: a future block on their lane.
// Public like tasks (ADR-0007), and not a WorkSession — no voice evidence.
export type DashboardPlanBlock = {
  id: Id<'planBlock'>
  startAt: number
  endAt: number
}

// The member's one NOW task: the user-level active pointer, not tied to a
// WorkSession and not cleared when tracking stops (ST-27). Public like every task
// title (ADR-0007). Null when the pointer is unset or stale.
export type DashboardActiveTask = {
  id: Id<'task'>
  title: string
}

// One card on the dashboard: a person's whole day.
export type DashboardMember = {
  userId: Id<'users'> | null
  discordId: string
  // Profile fields are null when the Discord row was never linked to Clerk; the
  // client falls back to `discordId` for the name.
  name: string | null
  image: string | null
  // Currently in a study channel (has an active workSession). Derived from data, not
  // the clock.
  online: boolean
  workSessions: DashboardWorkSession[]
  // The member's planBlocks for this Day, oldest first. planBlocks are public,
  // so they ride on every member's card, even when they have no workSessions today.
  planBlocks: DashboardPlanBlock[]
  // What the member says they are on right now, for the room rail.
  activeTask: DashboardActiveTask | null
}
