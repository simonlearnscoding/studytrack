import { DASHBOARD_TIME_ZONE, startOfDay } from '@studytrack/backend/convex/workSessions/util'
import { useEffect, useState } from 'react'
import { useMounted } from '~/hooks/use-mounted'
import { useDateStore } from '~/state/date.store'
import { focusDayLabel, isFocusDayToday } from '../../focus-day'
import type { DayTaskQueue } from '../task-types'
import type { WorkSessionTracking } from '../../use-tracking-status'
import { NowBar } from './now-bar'
import { TaskSheet } from './task-sheet'

// The mobile task dock: a sticky bottom bar that always shows what you're on,
// with a sheet that expands to the whole list and the composer. The queue state
// is owned by FocusView so the desktop pane and this dock share one source of
// truth; the dock owns only whether its sheet is open.
export function MobileTaskDock({
  queue,
  tracking,
  roomCount,
}: {
  queue: DayTaskQueue
  tracking: WorkSessionTracking
  roomCount: number
}) {
  const [open, setOpen] = useState(false)
  const { state, actions } = queue
  const { isOnline, isManual, canStartManual, startManual, toggleManual } = tracking
  // The bar is the read surface for the Day on screen, so it must say which Day
  // that is before it offers a tick. Gated behind mount for SSR parity.
  const selectedDate = useDateStore((dateState) => dateState.selectedDate)
  const mounted = useMounted()
  const dayStart = startOfDay(selectedDate.getTime(), DASHBOARD_TIME_ZONE)
  const isViewingToday = !mounted || isFocusDayToday(dayStart, Date.now())
  const dayLabel = mounted ? focusDayLabel(dayStart, isViewingToday) : 'Today'

  // Lock the page behind the sheet and close it on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <NowBar
        isOnline={isOnline}
        canStartManual={canStartManual}
        isViewingToday={isViewingToday}
        dayLabel={dayLabel}
        now={state.now}
        roomCount={roomCount}
        onStart={startManual}
        onOpen={() => setOpen(true)}
        onTick={() => state.now && actions.toggleTaskDone(state.now.id)}
      />
      <TaskSheet
        open={open}
        isManualTracking={isManual}
        canStartManual={canStartManual}
        loading={state.status === 'loading'}
        openTasks={state.openTasks}
        doneTasks={state.doneTasks}
        nowId={state.now?.id ?? null}
        dayLabel={dayLabel}
        onClose={() => setOpen(false)}
        onAdd={actions.addTask}
        onTick={actions.toggleTaskDone}
        onRename={actions.renameTask}
        onRemove={actions.removeTask}
        onToggleTracking={toggleManual}
      />
    </>
  )
}
