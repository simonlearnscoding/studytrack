import { v, type Infer } from 'convex/values'

export const setOffsetArgs = v.object({ offsetMs: v.number() })
export type SetOffsetArgs = Infer<typeof setOffsetArgs>

// The dashboard's dev clock. `enabled` is decided by the deployment, never by the
// caller; a production deployment always reads `enabled: false` and ignores the
// stored offset.
export type DevClock = {
  enabled: boolean
  offsetMs: number
}
