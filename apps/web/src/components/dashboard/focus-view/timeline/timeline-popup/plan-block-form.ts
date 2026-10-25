import { DAY_MINUTES } from '@studytrack/backend/convex/timeline/types'

// The popover edits on the same grain the lane's drag snaps to.
export const PLAN_GRAIN_MIN = 15

export type PlanBlockFormValues = {
  title: string
  startMin: number
  endMin: number
}

// "HH:MM" → minutes from the Day start. Minutes-of-day, so 24:00 is a legal end
// even though a native time input cannot hold it.
export function parseClockText(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  if (hours < 0 || hours > 24 || minutes < 0 || minutes > 59) return null
  const total = hours * 60 + minutes
  return total <= DAY_MINUTES ? total : null
}

// Mirror of the backend's window rules, so a bad draft fails at the field
// instead of after a round trip. Overlap is the one rule the client cannot see
// without the live read; the mutation still answers it inline.
export function planBlockFormError({
  values,
  nowMin,
  isWindowEditable,
}: {
  values: PlanBlockFormValues
  nowMin: number
  isWindowEditable: boolean
}): string | null {
  if (!isWindowEditable) return null
  if (values.startMin < 0 || values.endMin > DAY_MINUTES) return 'Keep the plan inside its day.'
  if (values.endMin <= values.startMin) return 'The end must be after the start.'
  if (values.startMin % PLAN_GRAIN_MIN !== 0 || values.endMin % PLAN_GRAIN_MIN !== 0) {
    return 'Times sit on 15-minute marks.'
  }
  if (values.startMin < planFloorMinute(nowMin)) return 'That time is in the past.'
  return null
}

export function planFloorMinute(nowMin: number): number {
  return Math.ceil(Math.max(0, nowMin) / PLAN_GRAIN_MIN) * PLAN_GRAIN_MIN
}
