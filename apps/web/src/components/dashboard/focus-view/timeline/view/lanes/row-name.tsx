import type { TimelineRowVM } from '@studytrack/backend/convex/timeline/types'
import { LiveDot } from '~/components/ui/live-dot'

// The name cell's contents — shared by the pinned names column (lg) and the
// mobile lane that pins under the site header. Your own name is the strongest
// line in the column: the owner scans their lane first, so it takes the body
// role at full foreground while everyone else stays a quiet gray caption.
export function RowName({ row }: { row: TimelineRowVM }) {
  return (
    <>
      {row.live && <LiveDot className="h-1.5 w-1.5 text-primary" />}
      <p
        className={`min-w-0 truncate ${
          row.you
            ? 'text-body font-medium text-foreground'
            : `text-xs ${row.live ? 'text-white/80' : 'text-white/35'}`
        }`}
      >
        {row.name}
      </p>
      {row.you && (
        <span className="border-primary/30 text-primary shrink-0 rounded border px-1 text-[9px] tracking-wider">
          you
        </span>
      )}
      <span className="shrink-0 font-mono text-[11px] text-white/60">{row.tail}</span>
    </>
  )
}
