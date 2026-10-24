import type { Id } from '@studytrack/backend/convex/_generated/dataModel'
import type { DashboardWorkSessionTask } from '@studytrack/backend/convex/workSessions/types'

// What a stored popover renders. Both branches share a member, a window and a
// task list, so the future detail surface (rename, delete, task planning) can
// build on the same shape instead of duplicating the planBlock/workSession cases.
type PopupBase = {
  member: string | null
  startAt: number
  endAt: number | null
  tasks: DashboardWorkSessionTask[]
}

// A gesture's uncommitted window, waiting on the Create button. It has no
// member or task list — those belong to a stored planBlock.
export type DraftPlanBlockPopupData = {
  kind: 'draft'
  startAt: number
  endAt: number
}

export type StoredPlanBlockPopupData = PopupBase & {
  kind: 'planBlock'
  planBlockId: Id<'planBlock'>
  missed: boolean
}

export type StoredWorkSessionPopupData = PopupBase & {
  kind: 'workSession'
  workSessionId: Id<'workSession'>
  live: boolean
}

export type StoredPopupData = StoredPlanBlockPopupData | StoredWorkSessionPopupData

export type TimelinePopupData = DraftPlanBlockPopupData | StoredPopupData
