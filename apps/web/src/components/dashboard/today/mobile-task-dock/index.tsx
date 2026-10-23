import { useEffect, useState } from 'react'
import type { DayTaskQueue } from '../task-types'
import type { SessionTracking } from '../use-tracking-status'
import { NowBar } from './now-bar'
import { TaskSheet } from './task-sheet'

// The mobile task dock: a sticky bottom bar that always shows what you're on,
// with a sheet that expands to the whole list and the composer. The queue state
// is owned by TodayLayout so the desktop pane and this dock share one source of
// truth; the dock owns only whether its sheet is open.
export function MobileTaskDock({
  queue,
  tracking,
  roomCount,
}: {
  queue: DayTaskQueue
  tracking: SessionTracking
  roomCount: number
}) {
  const [open, setOpen] = useState(false)
  const { state, actions } = queue
  const { isOnline, isManual, canStartManual, startManual, toggleManual } = tracking

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
        tasks={state.tasks}
        nowId={state.now?.id ?? null}
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
