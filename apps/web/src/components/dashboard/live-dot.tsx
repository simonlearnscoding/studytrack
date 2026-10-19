import { cn } from '~/lib/utils'

// The liveness indicator — a solid dot with a soft ping ring expanding off
// it. It takes the current text color, so it reads emerald inside
// text-primary contexts and the mode color inside manual-tracking ones;
// pass a size (h-1.5 w-1.5) for tight rows. Never hand-roll animate-ping
// dots — the reduced-motion hiding lives here, once.
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative flex h-2 w-2 shrink-0', className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60 motion-reduce:hidden" />
      <span className="relative inline-flex h-full w-full rounded-full bg-current" />
    </span>
  )
}
