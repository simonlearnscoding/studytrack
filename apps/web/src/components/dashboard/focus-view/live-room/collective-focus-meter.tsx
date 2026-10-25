import { collectiveFocusMs } from '@studytrack/backend/convex/workSessions/metrics'
import type { DashboardMember } from '@studytrack/backend/convex/workSessions/types'
import { formatDurationClock } from '@studytrack/backend/convex/workSessions/util'
import { useMounted } from '~/hooks/use-mounted'
import { useNow } from '~/hooks/use-now'
import type { Metric } from '@studytrack/backend/convex/preferences/types'

// The room's shared timer (ST-25, "Collective focus time"): the time everyone in
// the room has put into this sitting, summed — one second per person per second.
// It ticks at 10 Hz and shows whole seconds, so a room of N reads as an ordinary
// clock running N times as fast (smooth, a second at a time) rather than jumping
// by N once a second. It owns that fast clock so the ticks never re-render the
// rest of the rail, and it follows the site metric switch: Focus integrates Deep
// focus only, Total counts every second in the room.
export function CollectiveFocusMeter({
  members,
  metric,
}: {
  members: DashboardMember[]
  metric: Metric
}) {
  const mounted = useMounted()
  const now = useNow(100)
  const isTotal = metric === 'total'

  return (
    <div className="card-surface mb-2.5 px-4 py-3.5">
      <p className="text-label">{isTotal ? 'Time together' : 'Focus together'}</p>
      <div className="pt-2">
        {mounted ? (
          <p className="text-metric font-mono font-medium">
            {formatDurationClock(collectiveFocusMs(members, now, metric))}
          </p>
        ) : (
          <span aria-hidden className="skeleton inline-block h-6 w-32 rounded" />
        )}
      </div>
    </div>
  )
}
