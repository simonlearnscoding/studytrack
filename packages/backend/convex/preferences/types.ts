import { v, type Infer } from 'convex/values'

// The two cuts of study time the dashboard can lead with: `focus` = Deep focus,
// `total` = Total time (see GLOSSARY). A member's choice is a Preference.
export const metric = v.union(v.literal('focus'), v.literal('total'))
export type Metric = Infer<typeof metric>

export const setMetricArgs = v.object({ metric })

// The Done group's fold state. Absent on rows written before the column
// existed; a missing value reads as expanded.
export const setDoneFoldedArgs = v.object({ folded: v.boolean() })

// The Period the leaderboard leads with. One member-wide choice, so the board
// opens on the same Day/Week/Month across devices.
export const leaderboardPeriod = v.union(v.literal('day'), v.literal('week'), v.literal('month'))
export type LeaderboardPeriod = Infer<typeof leaderboardPeriod>

export const setLeaderboardPeriodArgs = v.object({ period: leaderboardPeriod })

// The caller's display Preferences with defaults already applied, so the web
// never invents its own fallback. The metric, the Done group's fold state and the
// leaderboard Period are stored, each in its own column.
export type Preference = {
  metric: Metric
  isDoneFolded: boolean
  leaderboardPeriod: LeaderboardPeriod
}
