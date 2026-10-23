import { ListChecks, Play } from 'lucide-react'
import type { ReactNode } from 'react'
import { Checkbox } from '~/components/ui/checkbox'
import { cn } from '~/lib/utils'
import { LiveDot } from '../../../../ui/live-dot'
import type { DockTask } from './types'

// The sticky bottom bar — mobile only, centred, floating over the page.
//
// This bar is the read surface for the Now task: the topmost open task, with a
// checkbox to complete it. With nothing queued it says so. The list opens the
// sheet.
export function NowBar({
  isOnline,
  canStartManual,
  now,
  roomCount,
  onStart,
  onOpen,
  onTick,
}: {
  isOnline: boolean
  canStartManual: boolean
  now?: DockTask
  roomCount: number
  onStart: () => void
  onOpen: () => void
  onTick: () => void
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(0.625rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-3 lg:hidden">
      <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-popover/90 shadow-overlay-bar backdrop-blur">
        {isOnline ? (
          <div className="flex h-15 items-center gap-1.5 pr-2 pl-4">
            <button
              type="button"
              onClick={onOpen}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
            >
              <LiveDot
                className={cn(
                  'h-1.5 w-1.5 shrink-0',
                  now ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <span className="min-w-0 flex-1">
                <span className={cn('text-label block', now && 'text-primary')}>Now</span>
                <span className="block truncate text-sm font-medium text-foreground">
                  {now?.title ?? 'Nothing queued'}
                </span>
              </span>
            </button>
            {now && (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center">
                <Checkbox
                  defaultChecked={false}
                  onClick={() => onTick()}
                  aria-label="Complete task"
                />
              </div>
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
              disabled={!canStartManual}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-secondary/60 disabled:cursor-default disabled:opacity-60"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-tint ring-1 ring-primary/40 ring-inset">
                <Play className="ml-0.5 h-3 w-3 fill-primary text-primary" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">Start tracking</span>
                <span className="text-caption block truncate">· {roomCount} in the room</span>
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
}: {
  children: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-secondary/40 text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </button>
  )
}
