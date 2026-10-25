import type { StoredWorkSessionPopupData } from './types'
import { PopupTasks } from './popup-tasks'
import { PopupWindow } from './window-line'

// A stored workSession: when it ran and the tasks it holds. There is nothing to
// edit here — the clock wrote this block.
export function StoredWorkSessionPopup({
  data,
  dayStart,
  now,
}: {
  data: StoredWorkSessionPopupData
  dayStart: number
  now: number
}) {
  const endAt = data.endAt ?? now

  return (
    <>
      <div className="text-xs text-muted-foreground">
        <p>
          {data.live ? 'Live' : 'Done'}
          {data.member ? ` · ${data.member}` : ''}
        </p>
        <p className="mt-1 font-semibold text-foreground">Work session</p>
        <PopupWindow startAt={data.startAt} endAt={endAt} dayStart={dayStart} />
      </div>

      <PopupTasks
        heading="Tasks in this work session"
        emptyMessage="No tasks in this work session."
        tasks={data.tasks}
        dayStart={dayStart}
      />
    </>
  )
}
