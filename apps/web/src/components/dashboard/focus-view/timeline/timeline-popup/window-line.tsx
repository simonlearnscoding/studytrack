import { formatDurationHM } from '@studytrack/backend/convex/workSessions/util'
import { formatClock, toMinute } from '@studytrack/backend/convex/timeline/util'

// The one line every popover branch shows: start – end · duration, all in the
// Day's clock. `endAt` is the live now for an active workSession, resolved by the
// caller.
export function PopupWindow({
  startAt,
  endAt,
  dayStart,
}: {
  startAt: number
  endAt: number
  dayStart: number
}) {
  return (
    <p className="mt-1 font-mono">
      {formatClock(toMinute(startAt, dayStart))} – {formatClock(toMinute(endAt, dayStart))} ·{' '}
      {formatDurationHM(endAt - startAt)}
    </p>
  )
}
