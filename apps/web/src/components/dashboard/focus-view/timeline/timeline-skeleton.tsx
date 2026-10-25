import { cn } from '~/lib/utils'

// A shape-for-shape stand-in for the day timeline: the same legend gap, the
// pinned mobile lane and desktop bar, the names column and the room's track at
// the same heights and breakpoints. Matching the real geometry means the reveal
// swaps content in place instead of resizing the page under it.

// Deterministic — no Math.random(): the server and the first client paint must
// agree or hydration mismatches.
const TICKS = 10
const NOW_LEFT = '55%'
const YOUR_BARS = [
  { left: '8%', width: '42%' },
  { left: '55%', width: '28%' },
]
const ROOM_LANES = [
  { left: '16%', width: '48%', nameWidth: 'w-20' },
  { left: '4%', width: '74%', nameWidth: 'w-16' },
  { left: '26%', width: '34%', nameWidth: 'w-24' },
  { left: '0%', width: '58%', nameWidth: 'w-14' },
  { left: '34%', width: '44%', nameWidth: 'w-20' },
]

// Mirrors the real name cells, including the taller sticky "you" cell.
const NAME_ROW = 'flex h-6 w-40 items-center gap-1.5 lg:w-44 lg:pr-2'
const YOUR_NAME_ROW = `${NAME_ROW} max-lg:hidden lg:sticky lg:top-19 lg:z-[5] lg:h-28 lg:pt-9 lg:bg-background/80 lg:backdrop-blur`

export function TimelineSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none select-none', className)}>
      {/* TrackLegend is static chrome: keep its row height, not its "?" */}
      <div className="h-5" />

      {/* mobile: your labels + lane pin flush under the site header */}
      <div className="sticky top-14 z-30 -mx-3.5 border-b border-border bg-background/80 px-3.5 pt-2 pb-1 backdrop-blur lg:hidden">
        <div className="flex gap-2">
          <div className="w-40 shrink-0">
            <div className="h-[30px]" />
            <div className="flex h-6 items-center gap-1.5">
              <span className="skeleton h-2.5 w-20 rounded-full" />
            </div>
          </div>
          <div className="min-w-0 flex-1 overflow-hidden pb-4">
            <div className="relative">
              <span
                className="bg-primary/25 absolute top-0 bottom-0 w-[1.5px]"
                style={{ left: NOW_LEFT }}
              />
              <div className="relative flex h-[30px] items-end justify-between">
                <SkeletonTicks />
                <span
                  className="skeleton absolute top-0 h-3 w-12 -translate-x-1/2 rounded-md"
                  style={{ left: NOW_LEFT }}
                />
              </div>
              <div className="relative flex h-9 items-center bg-white/[0.12] ring-1 ring-white/[0.1] ring-inset">
                {YOUR_BARS.map((bar) => (
                  <span
                    key={bar.left}
                    className="skeleton absolute inset-y-0 rounded-full"
                    style={{ left: bar.left, width: bar.width }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* the body: names column pinning beside the track column */}
      <div className="mt-4 flex gap-2 pb-2 max-lg:-mx-3.5 max-lg:px-3.5 lg:gap-0">
        <div className="flex shrink-0 flex-col gap-3.5 pt-6 max-lg:pt-0">
          <div className={YOUR_NAME_ROW}>
            <span className="skeleton h-2.5 w-20 rounded-full" />
          </div>
          {ROOM_LANES.map((lane, i) => (
            <div key={i} className={NAME_ROW}>
              <span className={cn('skeleton h-2.5 rounded-full', lane.nameWidth)} />
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col pt-6 max-lg:pt-0">
          {/* lg+: your ruler and lane pin directly under the hero */}
          <div className="sticky top-19 z-[6] overflow-x-clip bg-background/80 backdrop-blur max-lg:hidden">
            <div className="relative w-full">
              <span
                className="bg-primary/25 absolute inset-y-0 -bottom-3.5 w-[1.5px]"
                style={{ left: NOW_LEFT }}
              />
              <div className="relative h-6">
                <div className="flex h-full items-start justify-between pt-3">
                  <SkeletonTicks />
                </div>
                <span
                  className="skeleton absolute -top-4 h-3 w-12 -translate-x-1/2 rounded-md"
                  style={{ left: NOW_LEFT }}
                />
              </div>
              <div className="h-[5.5rem] pt-8">
                <div className="relative h-9 bg-white/[0.12] ring-1 ring-white/[0.1] ring-inset">
                  {YOUR_BARS.map((bar) => (
                    <span
                      key={bar.left}
                      className="skeleton absolute inset-y-0 rounded-full"
                      style={{ left: bar.left, width: bar.width }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* the room's tracks below */}
          <div className="min-w-0 pb-2">
            <div className="relative min-h-56">
              <span
                className="bg-primary/25 absolute top-0 bottom-1.5 w-[1.5px]"
                style={{ left: NOW_LEFT }}
              />
              <div className="relative flex flex-col gap-3.5 lg:pt-3.5">
                {ROOM_LANES.map((lane, i) => (
                  <div key={i} className="flex h-6 items-center">
                    <div className="relative h-2.5 w-full bg-white/[0.035]">
                      <span
                        className="skeleton absolute inset-y-0 rounded-full"
                        style={{ left: lane.left, width: lane.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// The hour marks are drawn as tiny pills: the real ruler's labels, without
// pretending to know the measured axis.
function SkeletonTicks() {
  return (
    <>
      {Array.from({ length: TICKS }, (_, i) => (
        <span key={i} className="skeleton h-1.5 w-4 rounded-full" />
      ))}
    </>
  )
}
