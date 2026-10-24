import type { StudyMode } from '../bot/types'

// What pressing "start tracking" should do, given the mode of whatever workSession
// is already active for the member. A "state" question as an enum of tags, so
// the caller dispatches instead of guessing.
export type ManualStartAction = 'start' | 'reject-on-discord' | 'reject-tracking'

export function decideManualStart(activeMode: StudyMode | null): ManualStartAction {
  if (activeMode === null) return 'start'
  if (activeMode === 'manual') return 'reject-tracking'
  return 'reject-on-discord'
}
