import { v, type Infer } from 'convex/values'

// The two cuts of study time the dashboard can lead with: `focus` = Deep focus,
// `total` = Total time (see GLOSSARY). A member's choice is a Preference.
export const metric = v.union(v.literal('focus'), v.literal('total'))
export type Metric = Infer<typeof metric>

export const setMetricArgs = v.object({ metric })

// The caller's display Preferences with defaults already applied, so the web
// never invents its own fallback. Only the metric is stored today.
export type Preference = {
  metric: Metric
}
