import type { Id } from '@studytrack/backend/convex/_generated/dataModel'
import type { DashboardSessionTask } from '@studytrack/backend/convex/sessions/types'

// What a stored popover renders. Both branches share a member, a window and a
// task list, so the future detail surface (rename, delete, task planning) can
// build on the same shape instead of duplicating the plan/session cases.
type PopupBase = {
  member: string | null
  startAt: number
  endAt: number | null
  tasks: DashboardSessionTask[]
}

// A gesture's uncommitted window, waiting on the Create button. It has no
// member or task list — those belong to a stored plan.
export type DraftPlanPopupData = {
  kind: 'draft'
  startAt: number
  endAt: number
}

export type StoredPlanPopupData = PopupBase & {
  kind: 'plan'
  planId: Id<'plannedSession'>
  missed: boolean
}

export type StoredSessionPopupData = PopupBase & {
  kind: 'session'
  sessionId: Id<'session'>
  live: boolean
}

export type StoredPopupData = StoredPlanPopupData | StoredSessionPopupData

export type SessionPopupData = DraftPlanPopupData | StoredPopupData
