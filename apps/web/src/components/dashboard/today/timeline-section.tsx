import {
  formatClock,
  mergeExpansion,
  resolveWindow,
  toMinute,
  toTimelineRows,
} from '@studytrack/backend/convex/timeline/util'
import { useRef } from 'react'
import { useMounted } from '~/hooks/use-mounted'
import { cn } from '~/lib/utils'
import { DayTimeline } from './day-timeline'
import { ScenarioSwitcher } from './scenario-switcher'
import { useAutoExpansion } from './use-auto-expansion'
import { useElementWidth } from './use-element-width'
import { useExpansionPreference } from './use-expansion-preference'
import { useScenario } from './use-scenario'
import { TimelineSkeleton } from './timeline-skeleton'
import { useMetricStore } from '~/state/metric.store'

// The width the track assumes before it has measured itself — the fixed-scale
// core (18h × 32px/h) from the expansion spec. Server and first paint agree.
const FALLBACK_TRACK_PX = 576

// The timeline's wiring shell: pick the scenario (later: the live query), measure
// the track container, run the two pure helpers, and hand the view models to the
// dumb renderer.
//
// The lanes are first *seen* already at their true size: DayTimeline stays
// mounted (its scroller is what gets measured) but sits invisible behind a
// skeleton until `ready`, so there is no render-narrow-then-widen jump. The
// server renders the hidden state too, so hydration still matches.
export function TimelineSection() {
  const scenario = useScenario()
  // The lane tails follow the site-wide metric switch; lanes and their order
  // (sorted by Total) never change with it (ST-12).
  const metric = useMetricStore((s) => s.metric)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const availablePx = useElementWidth(scrollerRef, FALLBACK_TRACK_PX)
  const nowMin = toMinute(scenario.now, scenario.dayStart)
  const [manual, toggleBand] = useExpansionPreference()
  const auto = useAutoExpansion(nowMin)

  // False on the server and the first client paint, true from the next commit —
  // the same commit that lands the measured width, so the reveal render already
  // carries the true width and the lanes fade in once, at their final size.
  const ready = useMounted()

  // Pure derivations — no manual memoization; the React Compiler handles it.
  const expansion = mergeExpansion(manual, auto)
  const axis = resolveWindow({ nowMin, availablePx, expansion })
  const rows = toTimelineRows(scenario.members, {
    now: scenario.now,
    dayStart: scenario.dayStart,
    me: scenario.me,
    window: axis,
    metric,
  })

  return (
    <div className="flex flex-col gap-3">
      {import.meta.env.DEV && <ScenarioSwitcher />}
      <div className="relative">
        <div
          aria-hidden={!ready}
          className={cn(
            'transition-opacity duration-300 ease-out',
            ready ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          <DayTimeline
            window={axis}
            rows={rows}
            nowLabel={`now · ${formatClock(nowMin)}`}
            scrollerRef={scrollerRef}
            locked={auto.morning}
            onToggleBand={toggleBand}
            onPlanDrag={
              import.meta.env.DEV
                ? // DEV HARNESS (LD-6): planning is not built — this is where a
                  // drag-to-plan span lands. Swap for the real mutation later.
                  (span) => console.debug('[LD-6 harness] plan drag', span)
                : undefined
            }
          />
        </div>
        {!ready && <TimelineSkeleton className="absolute inset-0" />}
      </div>
    </div>
  )
}
