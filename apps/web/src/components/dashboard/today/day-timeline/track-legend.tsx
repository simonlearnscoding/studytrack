import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { BAR_LIVE } from '../bar-style'
import { label } from '../data'

// The track swatches, shown behind the "?" so the header stays quiet.
const legend = [
  { label: 'cam', swatch: 'bg-primary h-1 w-3' },
  { label: 'screen', swatch: `h-1 w-3 ${BAR_LIVE.screenShare}` },
  { label: 'voice', swatch: 'bg-primary/40 h-1 w-3' },
  { label: 'tracked', swatch: 'border-primary/55 bg-primary/10 h-1.5 w-3 border' },
  { label: 'planned', swatch: 'border-primary/55 h-[7px] w-3 border border-dashed' },
  {
    label: 'done',
    swatch: 'border-primary/75 bg-background h-1.5 w-1.5 rounded-[2px] border-[1.5px]',
  },
]

// The section label with a "?" that opens the track-colour legend.
export function TrackLegend() {
  return (
    <div className={`flex items-center gap-2.5 pl-0.5 ${label}`}>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="What the track colours mean"
            className="text-subtle-foreground hover:text-foreground ml-auto flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center text-[11px] leading-none font-semibold transition-colors"
          >
            ?
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6} className="w-40 p-3">
          <ul className="flex flex-col gap-2.5">
            {legend.map((item) => (
              <li
                key={item.label}
                className="text-muted-foreground flex items-center gap-2.5 text-xs"
              >
                <span className={`inline-block shrink-0 ${item.swatch}`} />
                {item.label}
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  )
}
