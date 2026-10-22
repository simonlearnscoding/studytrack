import type { NightBandSegment, NightBandVM } from '@studytrack/backend/convex/timeline/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const BAND_HANDLE_PX = 24

// The night band, so the desktop track and the pinned mobile mirror render the
// exact same strip and share one toggle. The vertical "0–6" label belongs to the
// room's strip (`showLabel`); the fold control belongs to the ruler surfaces —
// the pinned bar / mobile lane (`showChevron`). Each strip shows one thing, so
// neither is drawn twice down the same column.
export function BandLayer({
  bands,
  hidden,
  locked,
  showLabel = false,
  showChevron = true,
  onToggle,
}: {
  bands: NightBandVM[]
  hidden: number
  locked: boolean
  showLabel?: boolean
  showChevron?: boolean
  onToggle: () => void
}) {
  return (
    <>
      {bands.map(({ segment, offsetPx }) => (
        <NightBand
          key={segment.label}
          segment={segment}
          offsetPx={offsetPx}
          hiddenCount={hidden}
          locked={locked}
          showLabel={showLabel}
          showChevron={showChevron}
          onToggle={onToggle}
        />
      ))}
    </>
  )
}

// The night band: collapsed it is a tap-sized labelled strip that opens on
// click; expanded it leaves a slim handle at its outer edge that folds it back.
// The band sits at the axis start, so its expanded handle is the left edge.
function NightBand({
  segment,
  offsetPx,
  hiddenCount,
  locked,
  showLabel,
  showChevron,
  onToggle,
}: {
  segment: NightBandSegment
  offsetPx: number
  hiddenCount: number
  locked: boolean
  showLabel: boolean
  showChevron: boolean
  onToggle: () => void
}) {
  if (segment.collapsed) {
    return (
      // z-[4]: the strip must sit ABOVE the room's rows (z-[2]) and the now-line
      // (z-[3]). At z-0 the rows container swallowed the press, so the scroller's
      // pan grabbed it and the toggle never fired.
      <button
        type="button"
        aria-label={`Show the ${segment.label} night${hiddenCount > 0 ? `, ${hiddenCount} hidden` : ''}`}
        aria-expanded={false}
        onClick={onToggle}
        className="absolute inset-y-0 z-[4] flex cursor-pointer items-center justify-center overflow-hidden border-x border-white/[0.05] bg-white/[0.02] transition-colors hover:bg-white/[0.06]"
        style={{ left: offsetPx, width: segment.widthPx }}
      >
        {(showChevron || showLabel) && (
          <span className="pointer-events-none flex flex-col items-center justify-center gap-1.5">
            {showChevron && <ChevronLeft className="h-3 w-3 shrink-0 text-white/40" />}
            {showLabel && (
              <span className="text-label font-mono whitespace-nowrap [writing-mode:vertical-rl]">
                {segment.label}
              </span>
            )}
          </span>
        )}
        {showLabel && hiddenCount > 0 && (
          <span className="bg-primary/20 text-primary pointer-events-none absolute bottom-1 left-1/2 flex h-4 min-w-4 -translate-x-1/2 items-center justify-center rounded-full px-1 font-mono text-label">
            {hiddenCount}
          </span>
        )}
      </button>
    )
  }

  // Locked open by the clock (early morning): the band is open and cannot be
  // folded, so draw only the divider — no control that would do nothing.
  if (locked) {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 border-r border-white/[0.06]"
        style={{ left: offsetPx, width: BAND_HANDLE_PX }}
      />
    )
  }

  return (
    <button
      type="button"
      aria-label={`Hide the ${segment.label} night`}
      aria-expanded={true}
      onClick={onToggle}
      className="absolute inset-y-0 z-[4] flex cursor-pointer items-center justify-center border-white/[0.06] text-white/35 transition-colors hover:text-white/80 border-r"
      style={{ left: offsetPx, width: BAND_HANDLE_PX }}
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  )
}
