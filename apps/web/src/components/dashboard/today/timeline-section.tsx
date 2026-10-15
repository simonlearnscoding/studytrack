import {
  formatClock,
  mergeExpansion,
  resolveWindow,
  toMinute,
  toTimelineRows,
} from '@studytrack/backend/convex/timeline/util'
import { useMemo, useRef } from 'react'
import { DayTimeline } from './day-timeline'
import { ScenarioSwitcher } from './scenario-switcher'
import { useAutoExpansion } from './use-auto-expansion'
import { useElementWidth } from './use-element-width'
import { useExpansionPreference } from './use-expansion-preference'
import { useScenario } from './use-scenario'

// The width the track assumes before it has measured itself — the fixed-scale
// core (17h × 48px/h) from the expansion spec. Server and first paint agree.
const FALLBACK_TRACK_PX = 816

// The timeline's wiring shell: pick the scenario (later: the live query), measure
// the track container, run the two pure helpers, and hand the view models to the
// dumb renderer.
export function TimelineSection() {
  const scenario = useScenario()
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const availablePx = useElementWidth(scrollerRef, FALLBACK_TRACK_PX)
  const nowMin = toMinute(scenario.now, scenario.dayStart)
  const [manual, toggleBand] = useExpansionPreference()
  const auto = useAutoExpansion(nowMin)
  const expansion = useMemo(() => mergeExpansion(manual, auto), [manual, auto])

  const axis = useMemo(
    () => resolveWindow({ nowMin, availablePx, expansion }),
    [nowMin, availablePx, expansion]
  )
  const rows = useMemo(
    () =>
      toTimelineRows(scenario.members, {
        now: scenario.now,
        dayStart: scenario.dayStart,
        me: scenario.me,
        window: axis,
      }),
    [scenario, axis]
  )

  return (
    <div className="flex flex-col gap-3">
      {import.meta.env.DEV && <ScenarioSwitcher />}
      <DayTimeline
        window={axis}
        rows={rows}
        nowLabel={`now · ${formatClock(nowMin)}`}
        scrollerRef={scrollerRef}
        onToggleBand={toggleBand}
      />
    </div>
  )
}
