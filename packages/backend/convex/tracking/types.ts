import type { StudyMode } from '../bot/types'

// The signed-in member's tracking status, for the self rail. `mode` is the mode
// of their active partial: `manual` means the web timer is running, any other
// mode means a Discord voice session is live, and `null` means neither. Raw
// start timestamp only — the client derives elapsed time against its own clock.
export type TrackingStatus = {
  mode: StudyMode | null
  startedAt: number | null
}
