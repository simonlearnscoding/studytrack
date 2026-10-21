import { useEffect, useState } from 'react'
import type { TaskQueue } from '../use-task-queue'
import { NowBar } from './now-bar'
import { TaskSheet } from './task-sheet'

// The mobile task dock: a sticky bottom bar that always shows what you're on,
// with a sheet that expands to the whole list and the composer. The queue state
// is owned by TodayLayout so the desktop pane and this dock share one source of
// truth; the dock owns only whether its sheet is open.
export function MobileTaskDock({ queue, roomCount }: { queue: TaskQueue; roomCount: number }) {
  const [open, setOpen] = useState(false)

  const { loading, items, live, now, add, rename, remove, tick, startTracking, toggleTracking } =
    queue

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
        live={live}
        now={now}
        roomCount={roomCount}
        onStart={startTracking}
        onOpen={() => setOpen(true)}
        onTick={() => now && tick(now.id)}
      />
      <TaskSheet
        open={open}
        live={live}
        loading={loading}
        tasks={items}
        nowId={now?.id ?? null}
        onClose={() => setOpen(false)}
        onAdd={add}
        onTick={tick}
        onRename={rename}
        onRemove={remove}
        onToggleTracking={toggleTracking}
      />
    </>
  )
}
