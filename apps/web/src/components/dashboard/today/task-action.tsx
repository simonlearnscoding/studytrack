import type { ReactNode } from 'react'
import { cn } from '~/lib/utils'

// One icon action on a task row. Shared by the desktop pane and the mobile sheet
// so the start/stop, rename and delete controls stay identical.
export function TaskAction({
  label,
  onClick,
  accent = false,
  danger = false,
  children,
}: {
  label: string
  onClick: () => void
  accent?: boolean
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors',
        danger
          ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
          : accent
            ? 'text-primary hover:bg-primary-tint'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}
