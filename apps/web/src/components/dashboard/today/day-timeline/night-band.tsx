import type { BandSide } from '@studytrack/backend/convex/timeline/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { HiddenCounts, NightBandSegment, NightBandVM } from './types'

const BAND_HANDLE_PX = 24

// The night bands, so the desktop track and the pinned mobile mirror render the
// exact same strips and share one toggle.
export function BandLayer({
  bands,
  hidden,
  onToggle,
}: {
  bands: NightBandVM[]
  hidden: HiddenCounts
  onToggle: (side: BandSide) => void
}) {
  return (
    <>
      {bands.map(({ segment, offsetPx }) => (
        <NightBand
          key={segment.side}
          segment={segment}
          offsetPx={offsetPx}
          hiddenCount={hidden[segment.side]}
          onToggle={onToggle}
        />
      ))}
    </>
  )
}

// A night band: collapsed it is a tap-sized labelled strip that opens on click;
// expanded it leaves a slim handle at the outer edge that folds it back.
function NightBand({
  segment,
  offsetPx,
  hiddenCount,
  onToggle,
}: {
  segment: NightBandSegment
  offsetPx: number
  hiddenCount: number
  onToggle: (side: BandSide) => void
}) {
  const atStart = segment.side === 'morning'

  if (segment.collapsed) {
    return (
      <button
        type="button"
        aria-label={`Show the ${segment.label} night${hiddenCount > 0 ? `, ${hiddenCount} hidden` : ''}`}
        aria-expanded={false}
        onClick={() => onToggle(segment.side)}
        className="absolute inset-y-0 z-0 flex cursor-pointer items-center justify-center overflow-hidden border-x border-white/[0.05] bg-white/[0.02] transition-colors hover:bg-white/[0.06]"
        style={{ left: offsetPx, width: segment.widthPx }}
      >
        <span className="text-label pointer-events-none font-mono whitespace-nowrap [writing-mode:vertical-rl]">
          {segment.label}
        </span>
        {hiddenCount > 0 && (
          <span className="bg-primary/20 text-primary pointer-events-none absolute top-1 left-1/2 flex h-4 min-w-4 -translate-x-1/2 items-center justify-center rounded-full px-1 font-mono text-label">
            {hiddenCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-label={`Hide the ${segment.label} night`}
      aria-expanded={true}
      onClick={() => onToggle(segment.side)}
      className={`absolute inset-y-0 z-[4] flex cursor-pointer items-center justify-center text-white/35 transition-colors hover:text-white/80 ${atStart ? 'border-r' : 'border-l'} border-white/[0.06]`}
      style={{
        left: atStart ? offsetPx : offsetPx + segment.widthPx - BAND_HANDLE_PX,
        width: BAND_HANDLE_PX,
      }}
    >
      {atStart ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
    </button>
  )
}
