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

// One sitting belonging to a member today.
export type DashboardSession = {
  id: Id<'session'>
  status: 'active' | 'ended'
  startedAt: number
  endedAt: number | null
  partials: DashboardPartial[]
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
}
