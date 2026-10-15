import { useNavigate, useSearch } from '@tanstack/react-router'
import { cn } from '~/lib/utils'
import { label } from './data'
import { DEFAULT_SCENARIO, SCENARIOS, scenarioNames } from './scenarios'

// DEV HARNESS: a strip of buttons that switches the timeline scenario through
// the `?scenario=` param, so any state is reachable and shareable. Removed with
// the rest of the harness once the live query is wired.
export function ScenarioSwitcher() {
  const { scenario } = useSearch({ from: '/beta' })
  const active = scenario && scenario in SCENARIOS ? scenario : DEFAULT_SCENARIO
  const navigate = useNavigate()

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-white/15 p-2">
      <span className={`px-1 ${label}`}>scenario</span>
      {scenarioNames.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => navigate({ to: '/beta', search: { scenario: name } })}
          className={cn(
            'cursor-pointer rounded-md px-2 py-1 text-[11px] transition-colors',
            name === active
              ? 'bg-primary/20 text-primary'
              : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
          )}
        >
          {SCENARIOS[name].label}
        </button>
      ))}
    </div>
  )
}
