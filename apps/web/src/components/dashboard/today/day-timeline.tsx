import type { TimelineRowVM, TimelineWindow } from '@studytrack/backend/convex/timeline/types'
import { centreScrollLeft } from '@studytrack/backend/convex/timeline/util'
import { useEffect, useRef, type RefObject } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { LiveDot } from '../live-dot'
import { BAR_LIVE, barClass } from './bar-style'
import { label } from './data'

// The track swatches, shown behind the "?" so the header stays quiet.
const legend = [
  { label: 'cam', swatch: 'bg-primary h-1 w-3 rounded-full' },
  { label: 'screen', swatch: `h-1 w-3 rounded-full ${BAR_LIVE.screenShare}` },
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
  window: axis,
  rows,
  nowLabel,
  scrollerRef,
}: {
  window: TimelineWindow
  rows: TimelineRowVM[]
  nowLabel: string
  scrollerRef: RefObject<HTMLDivElement | null>
}) {
  const you = rows.find((r) => r.you)
  const now = axis.nowPx

  // The night bands, with their axis offsets, so they can be drawn as distinct
  // collapsed strips flanking the core.
  const bands: {
    segment: Extract<TimelineWindow['segments'][number], { kind: 'band' }>
    offsetPx: number
  }[] = []
  let bandOffset = 0
  for (const segment of axis.segments) {
    if (segment.kind === 'band') bands.push({ segment, offsetPx: bandOffset })
    bandOffset += segment.widthPx
  }

  // <lg the page scrolls, so the "you" lane can't live inside the sideways
  // scroller — a sticky child of overflow-x-auto only sticks to that box, never
  // to the page. It is rendered as its own bar under the site header, and this
  // mirror keeps its labels + track panned in lockstep with the real scroller.
  const mirrorRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const scroller = scrollerRef.current
    const mirror = mirrorRef.current
    if (!scroller || !mirror) return
    const sync = () => {
      mirror.style.transform = `translateX(${-scroller.scrollLeft}px)`
    }
    sync()
    scroller.addEventListener('scroll', sync, { passive: true })
    return () => scroller.removeEventListener('scroll', sync)
  }, [you, scrollerRef])

  // Open the track centred on "now", but only on mount and when the window
  // itself changes (resize, band expand) — never on the ticking clock, so the
  // view does not jump each second, and a manual scroll survives.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollLeft = centreScrollLeft({
      nowPx: axis.nowPx,
      widthPx: axis.widthPx,
      availablePx: scroller.clientWidth,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-snap on window change only
  }, [axis.widthPx, axis.overflow, scrollerRef])

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
              <div ref={mirrorRef} className="relative" style={{ width: axis.widthPx }}>
                {/* the now-line through the whole pinned lane — full height so
                    the pill (opaque) just paints over its top, seam-free */}
                <div
                  className="bg-primary absolute top-0 bottom-0 w-[1.5px]"
                  style={{ left: now }}
                />
                <div className="relative h-[30px]">
                  {axis.ticks.map((t) => (
                    <span
                      key={t.label}
                      className={`absolute bottom-0 font-mono text-[10px] whitespace-nowrap text-white/45 ${
                        t.leftPx === 0
                          ? ''
                          : t.leftPx === axis.widthPx
                            ? '-translate-x-full'
                            : '-translate-x-1/2'
                      }`}
                      style={{ left: t.leftPx }}
                    >
                      {t.label}
                    </span>
                  ))}
                  <span
                    className="bg-primary-tint text-primary absolute top-0 -translate-x-1/2 block w-max rounded-md px-1.5 py-px leading-none font-mono text-[10px] font-semibold whitespace-nowrap"
                    style={{ left: now }}
                  >
                    {nowLabel}
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
              key={row.key}
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
          <div className="relative min-h-10" style={{ width: axis.widthPx }}>
            {/* the night bands — thin, labelled collapsed strips at both ends.
                Expanding one (T4) grows it to real scale and widens the axis. */}
            {bands.map(({ segment, offsetPx }) => (
              <div
                key={segment.side}
                className={`absolute inset-y-0 z-[1] overflow-hidden ${segment.collapsed ? 'border-x border-white/[0.05] bg-white/[0.02]' : ''}`}
                style={{ left: offsetPx, width: segment.widthPx }}
              >
                {segment.collapsed && (
                  <span className="text-label pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-mono whitespace-nowrap [writing-mode:vertical-rl]">
                    {segment.label}
                  </span>
                )}
              </div>
            ))}

            {/* hour gridlines */}
            {axis.ticks.map((t) => (
              <div
                key={t.label}
                className="absolute top-5 bottom-2 w-px bg-white/[0.05]"
                style={{ left: t.leftPx }}
              />
            ))}

            {/* hour labels — pinned ladder on lg: hero (0..4.75rem) → this strip +
                the "now" pill (4.75..6.25rem) → your lane (6.25..9.5rem). Every band
                carries the same bg + blur and pins flush against the one above, so
                the stack reads as a single element while the list scrolls under.
                <lg they ride in the pinned lane above instead. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[4] h-px max-lg:hidden lg:sticky lg:top-19 lg:h-6 lg:bg-background/80 lg:backdrop-blur">
              {/* the now-line, faked through this band: the real line (z-[3]) is
                  covered by the bar, so each band draws its own segment at `now`.
                  Full-height: the pill paints over its top, so no seam regardless
                  of how the pill's font metrics round. */}
              <div className="bg-primary absolute top-0 bottom-0 w-[1.5px]" style={{ left: now }} />
              {axis.ticks.map((t) => (
                <span
                  key={t.label}
                  className={`absolute top-0 font-mono text-[10px] whitespace-nowrap text-white/45 lg:top-3 ${
                    t.leftPx === 0
                      ? ''
                      : t.leftPx === axis.widthPx
                        ? '-translate-x-full'
                        : '-translate-x-1/2'
                  }`}
                  style={{ left: t.leftPx }}
                >
                  {t.label}
                </span>
              ))}
            </div>

            {/* now-line — every live bar ends here. z-[3]: above the rows (z-[2]),
                below every band of the pinned bar so it never crosses it.
                <lg the pill rides in the pinned lane. */}
            <div
              className="bg-primary absolute -top-0.5 bottom-1.5 z-[3] w-[1.5px]"
              style={{ left: now }}
            />
            {/* the pill rides a zero-width rail at `now` — `left` here is plain
                absolute positioning, so `lg:sticky` below only pins it vertically
                and -translate-x-1/2 keeps it centered on the line. z-auto rail:
                no stacking context, so the pill's z-[7] still beats the strip. */}
            <div className="absolute inset-y-0 w-0 max-lg:hidden" style={{ left: now }}>
              <span className="bg-primary-tint text-primary absolute -top-4 -translate-x-1/2 block w-max rounded-md px-1.5 py-px leading-none font-mono text-[10px] font-semibold whitespace-nowrap lg:sticky lg:top-19 lg:-mt-4 z-[7]">
                {nowLabel}
              </span>
            </div>

            {/* contract: tracks only; the name column is the pinned sibling.
                a shadcn Popover hangs off each bar (session details) in prod.
                Your track-row is a sibling OUTSIDE the z-[2] rows column — inside
                it, the lane's z-[6] would be trapped under the now-line (z-[3])
                and the line would paint through the lane's blur. */}
            {you && (
              <div className="mb-3.5 flex h-6 items-center max-lg:hidden lg:sticky lg:top-25 lg:z-[6] lg:h-13 lg:items-start lg:pt-6 lg:bg-background/80 lg:backdrop-blur">
                {/* the now-line's segment through the lane — it meets the live
                    bar's leading edge, so the lane reads as the line's origin */}
                <div className="bg-primary absolute inset-y-0 w-[1.5px]" style={{ left: now }} />
                <RowTrack row={you} />
              </div>
            )}
            <div className="relative z-[2] flex flex-col gap-3.5">
              {rows
                .filter((row) => !row.you)
                .map((row) => (
                  <div key={row.key} className="flex h-6 items-center">
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
function RowName({ row }: { row: TimelineRowVM }) {
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
      <span className="shrink-0 font-mono text-[11px] text-white/60">{row.tail}</span>
    </>
  )
}

// One person's track bar — shared by the scrolling list and the mobile pinned lane.
function RowTrack({ row }: { row: TimelineRowVM }) {
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
