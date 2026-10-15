import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { useEffect, useRef } from 'react'
import { LiveDot } from '../live-dot'
import { label, segEnded, segLive, type Hour, type TimelineRow } from './data'

// The track swatches, shown behind the "?" so the header stays quiet.
const legend = [
  { label: 'cam', swatch: 'bg-primary h-1 w-3 rounded-full' },
  { label: 'screen', swatch: `h-1 w-3 rounded-full ${segLive.screen}` },
  { label: 'voice', swatch: 'bg-primary/40 h-1 w-3 rounded-full' },
  { label: 'tracked', swatch: 'border-primary/55 bg-primary/10 h-1.5 w-3 rounded-[2px] border' },
  { label: 'planned', swatch: 'border-primary/55 h-[7px] w-3 rounded-[2px] border border-dashed' },
  {
    label: 'done',
    swatch: 'border-primary/75 bg-background h-1.5 w-1.5 rounded-full border-[1.5px]',
  },
]

// Names + hours live in a pinned column; only the track area scrolls sideways, so
// you can run the timeline out past the viewport without losing whose row is whose.
export function DayTimeline({
  hours,
  now,
  rows,
}: {
  hours: Hour[]
  now: number
  rows: TimelineRow[]
}) {
  const you = rows.find((r) => r.you)

  // <lg the page scrolls, so the "you" lane can't live inside the sideways
  // scroller — a sticky child of overflow-x-auto only sticks to that box, never
  // to the page. It is rendered as its own bar under the site header, and this
  // mirror keeps its labels + track panned in lockstep with the real scroller.
  const scrollerRef = useRef<HTMLDivElement>(null)
  const mirrorRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const scroller = scrollerRef.current
    const mirror = mirrorRef.current
    if (!scroller || !mirror) return
    const sync = () => {
      mirror.style.transform = `translateX(${-scroller.scrollLeft}px)`
    }
    scroller.addEventListener('scroll', sync, { passive: true })
    return () => scroller.removeEventListener('scroll', sync)
  }, [you])

  return (
    <section>
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

      {/* <lg: hour labels + your lane leave the list and pin flush under the site
          header — same surface recipe (bg + blur + border-b), no gap above, full
          bleed — so the two read as one element while the room scrolls under. */}
      {you && (
        <div className="sticky top-14 z-30 -mx-3.5 border-b border-border bg-background/80 px-3.5 pt-2 pb-1 backdrop-blur lg:hidden">
          <div className="flex gap-2">
            <div className="w-40 shrink-0">
              <div className="h-[30px]" />
              <div className="flex h-6 items-center gap-1.5">
                <RowName row={you} />
              </div>
            </div>
            <div className="min-w-0 flex-1 overflow-hidden pb-4">
              <div ref={mirrorRef} className="relative min-w-[40rem]">
                <div className="relative h-[30px]">
                  <div
                    className="bg-primary absolute top-3.5 bottom-0 w-[1.5px]"
                    style={{ left: `${now}%` }}
                  />
                  {hours.map((h) => (
                    <span
                      key={h.label}
                      className={`absolute bottom-0 font-mono text-[10px] whitespace-nowrap text-white/45 ${
                        h.pct === 0 ? '' : h.pct === 100 ? '-translate-x-full' : '-translate-x-1/2'
                      }`}
                      style={{ left: `${h.pct}%` }}
                    >
                      {h.label}
                    </span>
                  ))}
                  <span
                    className="bg-primary-tint text-primary absolute top-0 -translate-x-1/2 block w-max rounded-md px-1.5 py-px leading-none font-mono text-[10px] font-semibold whitespace-nowrap"
                    style={{ left: `${now}%` }}
                  >
                    now · 18:58
                  </span>
                </div>
                <div className="flex h-6 items-center">
                  <RowTrack row={you} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2 pb-2 max-lg:-mx-3.5 max-lg:px-3.5 lg:gap-0">
        {/* names + hours — pinned, never scroll */}
        <div className="flex shrink-0 flex-col gap-3.5 pt-6 max-lg:pt-0">
          {rows.map((row) => (
            <div
              key={row.name}
              className={`flex h-6 w-40 items-center gap-1.5 lg:w-44 lg:pr-2 ${row.you ? 'max-lg:hidden lg:sticky lg:top-19 lg:z-[5] lg:h-[4.75rem] lg:items-start lg:pt-6 lg:bg-background/80 lg:backdrop-blur' : ''}`}
            >
              <RowName row={row} />
            </div>
          ))}
        </div>

        {/* track area — fluid on lg+ (full day at a glance, no scroll), scrolls on mobile.
            lg uses clip, not overflow-hidden: it trims the 1px ruler overhang without
            becoming a scroll container, so the sticky "now" pill sticks to the page. */}
        <div
          ref={scrollerRef}
          className="min-w-0 flex-1 overflow-x-auto pt-6 pb-2 max-lg:pt-0 lg:overflow-x-clip"
        >
          <div className="relative min-w-[40rem] lg:min-w-0">
            {/* hour gridlines */}
            {hours.map((h) => (
              <div
                key={h.label}
                className="absolute top-5 bottom-2 w-px bg-white/[0.05]"
                style={{ left: `${h.pct}%` }}
              />
            ))}

            {/* hour labels — pinned ladder on lg: hero (0..4.75rem) → this strip +
                the "now" pill (4.75..6.25rem) → your lane (6.25..9.5rem). Every band
                carries the same bg + blur and pins flush against the one above, so
                the stack reads as a single element while the list scrolls under.
                <lg they ride in the pinned lane above instead. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[4] h-px max-lg:hidden lg:sticky lg:top-19 lg:h-6 lg:bg-background/80 lg:backdrop-blur">
              {hours.map((h) => (
                <span
                  key={h.label}
                  className={`absolute top-0 lg:top-3 font-mono text-[10px] whitespace-nowrap text-white/45 ${
                    h.pct === 0 ? '' : h.pct === 100 ? '-translate-x-full' : '-translate-x-1/2'
                  }`}
                  style={{ left: `${h.pct}%` }}
                >
                  {h.label}
                </span>
              ))}
            </div>

            {/* now-line — every live bar ends here. z-[3]: above the rows (z-[2]),
                below every band of the pinned bar so it never crosses it.
                <lg the pill rides in the pinned lane. */}
            <div
              className="bg-primary absolute -top-0.5 bottom-1.5 z-[3] w-[1.5px]"
              style={{ left: `${now}%` }}
            />
            <span
              className="bg-primary-tint text-primary absolute -top-4 -translate-x-1/2 block w-max rounded-md px-1.5 py-px leading-none font-mono text-[10px] font-semibold whitespace-nowrap max-lg:hidden lg:sticky lg:top-19 lg:-mt-4 z-[7]"
              style={{ left: `${now}%` }}
            >
              now · 18:58
            </span>

            {/* contract: tracks only; the name column is the pinned sibling.
                a shadcn Popover hangs off each bar (session details) in prod */}
            <div className="relative z-[2] flex flex-col gap-3.5">
              {rows.map((row) => (
                <div
                  key={row.name}
                  className={`flex h-6 items-center ${row.you ? 'max-lg:hidden lg:sticky lg:top-25 lg:z-[6] lg:h-13 lg:items-start lg:pt-6 lg:bg-background/80 lg:backdrop-blur' : ''}`}
                >
                  <RowTrack row={row} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// The name cell's contents — shared by the pinned names column (lg) and the
// mobile lane that pins under the site header.
function RowName({ row }: { row: TimelineRow }) {
  return (
    <>
      {row.live && <LiveDot className="h-1.5 w-1.5 text-primary" />}
      <p className={`min-w-0 truncate text-xs ${row.live ? 'text-white/80' : 'text-white/35'}`}>
        {row.name}
      </p>
      {row.you && (
        <span className="border-primary/30 text-primary shrink-0 rounded border px-1 text-[9px] tracking-wider">
          you
        </span>
      )}
      <span className="shrink-0 font-mono text-[11px] text-white/60">
        {row.you && <span className="text-primary">{row.tail.split(' · ')[0]}</span>}
        {row.you ? ' · ' + row.tail.split(' · ').slice(1).join(' · ') : row.tail}
      </span>
    </>
  )
}

// One person's track bar — shared by the scrolling list and the mobile pinned lane.
function RowTrack({ row }: { row: TimelineRow }) {
  return (
    <div
      className={`relative w-full rounded-full bg-white/[0.035] ${row.you ? 'h-3 cursor-crosshair' : 'h-2.5'}`}
    >
      {row.plans?.map((pl) => (
        <span
          key={pl.left}
          className="absolute -top-4 truncate text-[10px] text-white/50"
          style={{ left: `${pl.left}%` }}
        >
          {pl.label}
        </span>
      ))}
      {row.plans?.map((pl) => (
        <div
          key={pl.left}
          className="border-primary/50 bg-primary/5 absolute -top-[3px] -bottom-[3px] rounded-md border-[1.5px] border-dashed"
          style={{ left: `${pl.left}%`, width: `${pl.width}%` }}
        />
      ))}
      {row.bars.map((b, i) => (
        <div
          key={i}
          className={`absolute top-0 bottom-0 rounded-full ${b.live ? segLive[b.mode] : segEnded[b.mode]}`}
          style={{ left: `${b.left}%`, width: `${b.width}%` }}
        />
      ))}
      {row.dots?.map((d) => (
        <span
          key={d}
          className="border-primary/75 bg-background absolute top-1/2 z-[3] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px]"
          style={{ left: `${d}%` }}
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
