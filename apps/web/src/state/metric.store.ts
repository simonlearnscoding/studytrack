import { create } from 'zustand'

/** The two cuts of study time every Standing, live-session and calendar surface
 *  can lead with. `focus` = Deep focus, `total` = Total time (see GLOSSARY). */
export type Metric = 'focus' | 'total'

/**
 * The site-wide metric switch (ST-12 "Web Period board"): one store, one click
 * — the consistency board, the month calendar, the room rail's time-in-session
 * and the timeline's lane tails all read it. In-memory: defaults to Deep focus
 * every visit.
 */
interface MetricState {
  metric: Metric
  setMetric: (metric: Metric) => void
}

export const useMetricStore = create<MetricState>((set) => ({
  metric: 'focus',
  setMetric: (metric) => set({ metric }),
}))
