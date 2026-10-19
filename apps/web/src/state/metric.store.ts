import { create } from 'zustand'

/** The two cuts of study time every Standing and live-session surface can lead
 *  with. The month calendar stays on total (its study-time buckets were decided
 *  in ST-13); the switch follows members where they are compared or timed. */
export type Metric = 'focus' | 'total'

/**
 * The site-wide metric switch (ST-12 "Web Period board"): one store, one click
 * — the consistency board, the room rail's time-in-session and the timeline's
 * lane tails all read it. In-memory: defaults to Deep focus every visit.
 */
interface MetricState {
  metric: Metric
  setMetric: (metric: Metric) => void
}

export const useMetricStore = create<MetricState>((set) => ({
  metric: 'focus',
  setMetric: (metric) => set({ metric }),
}))
