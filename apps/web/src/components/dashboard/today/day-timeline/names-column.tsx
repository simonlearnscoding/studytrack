import type { TimelineRowVM } from '@studytrack/backend/convex/timeline/types'
import { RowName } from './row-name'

const NAME_CELL = 'flex h-6 w-40 items-center gap-1.5 lg:w-44 lg:pr-2'

// Your name cell is the desktop bar's twin: same height (7rem = hour strip +
// title band + lane), same surface, both lg-sticky — so name and lane pin
// together. On <lg your cell hides here and the pinned mobile lane owns it.
const YOUR_NAME_CELL = `${NAME_CELL} max-lg:hidden lg:sticky lg:top-19 lg:z-[5] lg:h-28 lg:items-start lg:pt-6 lg:bg-background/80 lg:backdrop-blur`

// The names column — the scroller's pinned sibling. Names never scroll
// sideways, so you always know whose lane is whose.
export function NamesColumn({ rows }: { rows: TimelineRowVM[] }) {
  return (
    <div className="flex shrink-0 flex-col gap-3.5 pt-6 max-lg:pt-0">
      {rows.map((row) => (
        <div key={row.key} className={row.you ? YOUR_NAME_CELL : NAME_CELL}>
          <RowName row={row} />
        </div>
      ))}
    </div>
  )
}
