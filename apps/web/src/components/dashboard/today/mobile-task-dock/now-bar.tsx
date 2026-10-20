import { formatDuration } from '@studytrack/backend/convex/sessions/util'
import { Check, ListChecks, Play, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '~/lib/utils'
import { LiveDot } from '../../live-dot'
import type { TaskId } from '../task-types'
import type { DockTask } from './types'

// The sticky bottom bar — mobile only, centred, floating over the page.
//
// This bar is the read surface for the active task: when one is set it shows
// "Now" with a tick to complete it and a × to clear the pointer; when none is
// set it shows the derived "Up next" suggestion with a play button that picks
// it. The list opens the sheet.
export function NowBar({
  live,
  active,
  suggestion,
  elapsedMs,
  showElapsed,
  roomCount,
  streak,
  onStart,
  onOpen,
  onTick,
  onSetActive,
  onClear,
}: {
  live: boolean
  active?: DockTask
  suggestion?: DockTask
  elapsedMs: number
  showElapsed: boolean
  roomCount: number
  streak: string
  onStart: () => void
  onOpen: () => void
  onTick: () => void
  onSetActive: (id: TaskId) => void
  onClear: () => void
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(0.625rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-3 lg:hidden">
      <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-popover/90 shadow-overlay-bar backdrop-blur">
        {live ? (
          <div className="flex h-15 items-center gap-1.5 pr-2 pl-4">
            <button
              type="button"
              onClick={onOpen}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
            >
              <LiveDot
                className={cn(
                  'h-1.5 w-1.5 shrink-0',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <span className="min-w-0 flex-1">
                <span className={cn('text-label block', active && 'text-primary')}>
                  {active ? 'Now' : 'Up next'}
                </span>
                <span className="block truncate text-sm font-medium text-foreground">
                  {active?.title ?? suggestion?.title ?? 'Nothing queued'}
                </span>
              </span>
            </button>
            {active && showElapsed && (
              <span className="shrink-0 font-mono text-xs text-primary tabular-nums">
                {formatDuration(elapsedMs)}
              </span>
            )}
            {active ? (
              <>
                <BarButton label="Complete task" onClick={onTick} accent>
                  <Check className="h-4 w-4" strokeWidth={3} />
                </BarButton>
                <BarButton label="Clear active task" onClick={onClear}>
                  <X className="h-4 w-4" />
                </BarButton>
              </>
            ) : (
              suggestion && (
                <BarButton
                  label="Work on this next"
                  onClick={() => onSetActive(suggestion.id)}
                  accent
                >
                  <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                </BarButton>
              )
            )}
            <BarButton label="All tasks" onClick={onOpen}>
              <ListChecks className="h-4 w-4" />
            </BarButton>
          </div>
        ) : (
          <div className="flex h-15 items-center gap-1.5 pr-2 pl-2">
            <button
              type="button"
              onClick={onStart}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-secondary/60"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-tint ring-1 ring-primary/40 ring-inset">
                <Play className="ml-0.5 h-3 w-3 fill-primary text-primary" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">Start tracking</span>
                <span className="text-caption block truncate">
                  · {roomCount} in the room · {streak} on the line
                </span>
              </span>
            </button>
            <BarButton label="All tasks" onClick={onOpen}>
              <ListChecks className="h-4 w-4" />
            </BarButton>
          </div>
        )}
      </div>
    </div>
  )
}

function BarButton({
  children,
  label,
  onClick,
  accent = false,
}: {
  children: ReactNode
  label: string
  onClick: () => void
  accent?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-colors',
        accent
          ? 'border-primary/40 bg-primary-tint text-primary'
          : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}
