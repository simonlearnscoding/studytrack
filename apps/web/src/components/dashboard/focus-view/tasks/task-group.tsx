import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '~/lib/utils'

/**
 * A named, foldable group of tasks: a full-width heading above a hairline, then
 * its body. The heading is a real button carrying `aria-expanded`, and a
 * collapsed body is unmounted so its rows leave the tab order. Only the caret
 * animates, and it respects reduced motion. Done and the Day's plan groups share
 * this heading; a plan uses `detail` for its window and `progress` for its
 * done/total count.
 */
export function TaskGroup({
  label,
  detail,
  count,
  progress,
  isExpanded,
  onToggle,
  trailing,
  children,
}: {
  label: string
  detail?: string
  count: number
  progress?: { done: number; total: number }
  isExpanded: boolean
  onToggle: () => void
  trailing?: ReactNode
  children: ReactNode
}) {
  const countText = progress ? `${progress.done}/${progress.total}` : String(count)
  const countAria = progress
    ? `${progress.done} of ${progress.total} tasks done`
    : `${count} ${count === 1 ? 'task' : 'tasks'}`
  const accessibleLabel = [label, detail, countAria].filter(Boolean).join(', ')

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-label={accessibleLabel}
        className="text-label flex w-full cursor-pointer items-center gap-2 border-b border-white/[0.06] px-2 py-2.5 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none"
      >
        <ChevronRight
          aria-hidden
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none',
            isExpanded && 'rotate-90'
          )}
        />
        <span className="min-w-0 truncate">{label}</span>
        {detail ? (
          <span className="text-subtle-foreground shrink-0 font-mono">{detail}</span>
        ) : null}
        <span aria-hidden>·</span>
        <span className="shrink-0 font-mono">{countText}</span>
        {trailing ? <span className="ml-auto">{trailing}</span> : null}
      </button>
      {isExpanded ? <ul className="space-y-0.5 pt-1">{children}</ul> : null}
    </div>
  )
}
