import { v, type Infer } from 'convex/values'

// The two cuts of study time the dashboard can lead with: `focus` = Deep focus,
// `total` = Total time (see GLOSSARY). A member's choice is a Preference.
export const metric = v.union(v.literal('focus'), v.literal('total'))
export type Metric = Infer<typeof metric>

export const setMetricArgs = v.object({ metric })

// The Done group's fold state. Absent on rows written before the column
// existed; a missing value reads as expanded.
export const setDoneFoldedArgs = v.object({ folded: v.boolean() })

// The caller's display Preferences with defaults already applied, so the web
// never invents its own fallback. The metric and the Done group's fold state are
// stored, each in its own column.
export type Preference = {
  metric: Metric
  isDoneFolded: boolean
}
