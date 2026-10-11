import { cn } from '~/lib/utils'
import { LEGEND_MODES, MODE_BAR, MODE_LABEL } from './mode-colors'

// Explains the timeline colours. Order matches the timeline palette, most engaged
// mode first.
export function ModeLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {LEGEND_MODES.map((mode) => (
        <li key={mode} className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-[3px]', MODE_BAR[mode])} aria-hidden />
          {MODE_LABEL[mode]}
        </li>
      ))}
    </ul>
  )
}
