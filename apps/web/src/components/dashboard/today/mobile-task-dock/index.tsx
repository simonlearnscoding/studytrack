import { useEffect, useState } from 'react'
import { useMounted } from '~/hooks/use-mounted'
import { useNow } from '~/hooks/use-now'
import type { TaskQueue } from '../use-task-queue'
import { NowBar } from './now-bar'
import { TaskSheet } from './task-sheet'

// The mobile task dock: a sticky bottom bar that always shows what you're on,
// with a sheet that expands to the whole list and the composer. The queue state
// is owned by TodayLayout so the desktop pane and this dock share one source of
// truth; the dock owns only whether its sheet is open.
export function MobileTaskDock({ queue, roomCount }: { queue: TaskQueue; roomCount: number }) {
  const mounted = useMounted()
  const now = useNow(1000)
  const [open, setOpen] = useState(false)

  const {
    loading,
    items,
    live,
    active,
    next,
    activeSince,
    add,
    rename,
    remove,
    tick,
    setActive,
    clearActive,
    startTracking,
    toggleTracking,
  } = queue
  const elapsedMs = activeSince != null ? now - activeSince : 0

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
        active={active}
        suggestion={next}
        elapsedMs={elapsedMs}
        showElapsed={mounted && !!active}
        roomCount={roomCount}
        onStart={startTracking}
        onOpen={() => setOpen(true)}
        onTick={() => active && tick(active.id)}
        onSetActive={setActive}
        onClear={clearActive}
      />
      <TaskSheet
        open={open}
        live={live}
        loading={loading}
        tasks={items}
        onClose={() => setOpen(false)}
        onAdd={add}
        onTick={tick}
        onSetActive={setActive}
        onClear={clearActive}
        onRename={rename}
        onRemove={remove}
        onToggleTracking={toggleTracking}
      />
    </>
  )
}
