import type { ComponentProps, ReactNode } from 'react'
import { cn } from '~/lib/utils'

// One icon action on a task row. Shared by the desktop pane and the mobile sheet
// so the rename, reschedule and delete controls stay identical. Props and ref
// pass through, so a `PopoverTrigger asChild` can own the button.
export function TaskAction({
  label,
  danger = false,
  className,
  children,
  ...buttonProps
}: { label: string; danger?: boolean; children: ReactNode } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      aria-label={label}
      {...buttonProps}
      className={cn(
        'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors',
        danger
          ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  )
}
