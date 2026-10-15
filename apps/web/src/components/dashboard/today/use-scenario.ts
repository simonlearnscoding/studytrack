import { useSearch } from '@tanstack/react-router'
import { getScenario, type Scenario } from './scenarios'

// DEV HARNESS: resolve the active timeline scenario from the `?scenario=` URL
// param. Stands in for the Convex query while the timeline is built frontend-
// first; delete with the rest of the harness once the live query is wired.
export function useScenario(): Scenario {
  const { scenario } = useSearch({ from: '/beta' })
  return getScenario(scenario)
}
