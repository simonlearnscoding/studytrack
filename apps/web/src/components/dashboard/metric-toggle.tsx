import { useMetricPreference } from '~/hooks/use-metric-preference'

// The per-surface metric switch lives on the leaderboard's range header — the
// one control every Standing / live-session surface follows (ST-12 "Web Period
// board").
const metrics = ['focus', 'total'] as const

export function MetricToggle() {
  const [metric, setMetric] = useMetricPreference()

  return (
    <div
      className="relative inline-flex rounded-full bg-white/[0.06] p-0.5"
      aria-label="Study time metric"
      role="group"
    >
      <span
        aria-hidden
        className={`absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%_-_2px)] rounded-full bg-white/[0.12] transition-transform duration-200 ease-out motion-reduce:transition-none ${
          metric === 'total' ? 'translate-x-full' : ''
        }`}
      />
      {metrics.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMetric(m)}
          aria-pressed={metric === m}
          className={`relative w-14 cursor-pointer rounded-full py-1 text-center text-[10.5px] font-semibold tracking-[0.16em] uppercase transition-colors ${
            metric === m ? 'text-foreground' : 'text-subtle-foreground hover:text-foreground'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  )
}
