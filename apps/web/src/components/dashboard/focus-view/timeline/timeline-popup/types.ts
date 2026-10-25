import type { Id } from '@studytrack/backend/convex/_generated/dataModel'
import type { DashboardWorkSessionTask } from '@studytrack/backend/convex/workSessions/types'

// What a stored popover renders. Both branches share a member and a window; the
// task list belongs to the branch — a workSession carries its own finished tasks,
// while a planBlock reads them live from its detail query.
type PopupBase = {
  member: string | null
  startAt: number
  endAt: number | null
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
  title: string | null
  missed: boolean
  isOwner: boolean
}

export type StoredWorkSessionPopupData = PopupBase & {
  kind: 'workSession'
  workSessionId: Id<'workSession'>
  live: boolean
  tasks: DashboardWorkSessionTask[]
}

export type StoredPopupData = StoredPlanBlockPopupData | StoredWorkSessionPopupData

export type TimelinePopupData = DraftPlanBlockPopupData | StoredPopupData
