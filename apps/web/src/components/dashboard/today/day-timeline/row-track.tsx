import type { TimelineRowVM } from '@studytrack/backend/convex/timeline/types'
import { barClass } from '../bar-style'

// One person's track bar — shared by the scrolling list and the pinned lanes.
// Bars are positioned slices; dots mark completed tasks on the bar.
export function RowTrack({ row }: { row: TimelineRowVM }) {
  return (
    <div
      className={`relative w-full rounded-full bg-white/[0.035] ${row.you ? 'h-3 cursor-crosshair' : 'h-2.5'}`}
    >
      {row.bars.map((bar, i) => (
        <div
          key={i}
          className={`absolute top-0 bottom-0 rounded-full ${barClass(bar.mode, bar.live)}`}
          style={{ left: bar.leftPx, width: bar.widthPx }}
        />
      ))}
      {row.dots.map((dot, i) => (
        <span
          key={i}
          className="border-primary/75 bg-background absolute top-1/2 z-[3] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px]"
          style={{ left: dot.leftPx }}
        />
      ))}
      {row.you && (
        <span className="pointer-events-none absolute -bottom-4 left-0 font-mono text-[9px] text-white/25">
          tap empty time to plan
        </span>
      )}
    </div>
  )
}
