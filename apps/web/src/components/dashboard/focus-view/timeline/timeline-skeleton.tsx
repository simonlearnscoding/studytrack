import { cn } from '~/lib/utils'

// A content-shaped stand-in for the day timeline: the hour strip, the names
// column, lane bars at staggered widths (yours full-width and a touch thicker),
// and the now-line with its pill — roughly the real geometry, so the reveal
// swaps like-for-like instead of box-for-timeline.

// Deterministic fills: no Math.random() — the server and client must render
// the identical skeleton or hydration mismatches.
const LANES = ['38%', '86%', '54%', '72%', '26%', '62%']
const YOUR_LANE = 1
const TICKS = 12
const NOW_LEFT = '55%'

export function TimelineSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('flex flex-col justify-center gap-3.5 py-6 max-lg:py-2', className)}
    >
      {/* hour strip */}
      <div className="flex h-2.5 items-center justify-between">
        {Array.from({ length: TICKS }, (_, i) => (
          <span key={i} className="skeleton h-1.5 w-7 rounded-full" />
        ))}
      </div>

      {/* lanes — a full-width bar stands in for the pinned desktop bar on lg */}
      <div className="relative flex flex-col gap-3.5">
        <span className="skeleton hidden h-3 w-full lg:block" />
        {LANES.map((fill, i) => (
          <div key={i} className="flex h-6 items-center gap-2">
            <span className="skeleton h-2.5 w-24 shrink-0 rounded-full max-lg:w-16" />
            <span
              className={cn('skeleton', i === YOUR_LANE ? 'h-3' : 'h-2.5')}
              style={{ width: fill }}
            />
          </div>
        ))}

        {/* the now-line and its pill, echoing the real one */}
        <span className="skeleton absolute top-0 bottom-0 w-[1.5px]" style={{ left: NOW_LEFT }} />
        <span
          className="skeleton absolute top-0 h-3 w-12 -translate-x-1/2 rounded-md"
          style={{ left: NOW_LEFT }}
        />
      </div>
    </div>
  )
}
