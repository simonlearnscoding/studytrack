import { createFileRoute } from '@tanstack/react-router'
import { TodayLayout } from '~/components/dashboard/today'

export const Route = createFileRoute('/beta')({
  // DEV HARNESS: `?scenario=` selects the timeline fixture (see scenarios.ts).
  validateSearch: (search: Record<string, unknown>): { scenario?: string } => ({
    scenario: typeof search.scenario === 'string' ? search.scenario : undefined,
  }),
  component: TodayLayout,
})
