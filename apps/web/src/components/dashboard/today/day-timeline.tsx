import type {
  BandSide,
  TimelineRowVM,
  TimelineWindow,
} from '@studytrack/backend/convex/timeline/types'
import { centreScrollLeft } from '@studytrack/backend/convex/timeline/util'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, type RefObject } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { LiveDot } from '../live-dot'
import { BAR_LIVE, barClass } from './bar-style'
import { label } from './data'

type NightBandSegment = Extract<TimelineWindow['segments'][number], { kind: 'band' }>

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
  onToggleBand,
}: {
  window: TimelineWindow
  rows: TimelineRowVM[]
  nowLabel: string
  scrollerRef: RefObject<HTMLDivElement | null>
  onToggleBand: (side: BandSide) => void
}) {
  const you = rows.find((r) => r.you)
  const now = axis.nowPx

  // Activity hidden inside each collapsed band, summed across the room. Shown as
  // a marker on the band rather than force-opening it.
  const hidden: Record<BandSide, number> = {
    morning: rows.reduce((count, row) => count + row.morningHidden, 0),
    evening: rows.reduce((count, row) => count + row.eveningHidden, 0),
  }

  // The night bands, with their axis offsets, so they can be drawn as distinct
  // collapsed strips flanking the core.
  const bands: { segment: NightBandSegment; offsetPx: number }[] = []
  let bandOffset = 0
  for (const segment of axis.segments) {
    if (segment.kind === 'band') bands.push({ segment, offsetPx: bandOffset })
    bandOffset += segment.widthPx
  }

  // Sticky children of overflow-x-auto only stick to that box, never to the
  // page — and a horizontal scroll container captures vertical sticky too. So
  // neither pinned lane can live inside the sideways scroller: the mobile lane
  // (<lg) and the desktop bar (lg) both render outside it, and these mirrors
  // keep their labels + tracks panned in lockstep with the real scroller.
  const mirrorRef = useRef<HTMLDivElement>(null)
  const desktopMirrorRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const scroller = scrollerRef.current
    const mirrors = [mirrorRef.current, desktopMirrorRef.current].filter(
      (el): el is HTMLDivElement => el !== null
    )
    if (!scroller || mirrors.length === 0) return
    const sync = () => {
      for (const mirror of mirrors) {
        mirror.style.transform = `translateX(${-scroller.scrollLeft}px)`
      }
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
                {/* the same night bands as the track, tappable with a thumb and
                    sharing the desktop expansion choice */}
                <BandLayer bands={bands} hidden={hidden} onToggle={onToggleBand} />
                {/* the now-line through the whole pinned lane — full height so
                    the pill (opaque) just paints over its top, seam-free */}
                <div
                  className="bg-primary absolute top-0 bottom-0 z-[2] w-[1.5px]"
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
                    className="bg-primary-tint text-primary absolute top-0 z-[3] -translate-x-1/2 block w-max rounded-md px-1.5 py-px leading-none font-mono text-[10px] font-semibold whitespace-nowrap"
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

        {/* track column: the pinned you-bar (lg) OUTSIDE the sideways scroller,
            then the scroller itself. overflow-x-auto captures vertical sticky
            descendants, so anything that must pin to the page can never live
            inside it — the bar mirrors the axis through a transform instead. */}
        <div className="flex min-w-0 flex-1 flex-col pt-6 max-lg:pt-0">
          {/* lg pinned bar: hour strip + "now" pill + your lane, stacked as one
              band under the hero (0..4.75rem) with the same bg + blur. Its axis
              copy is panned by the mirror effect, and overflow-x-clip trims the
              overhang without creating a scroll container — so the pill may
              still poke above the bar and nothing sticky lives inside. */}
          <div className="sticky top-19 z-[6] max-lg:hidden overflow-x-clip bg-background/80 backdrop-blur">
            <div ref={desktopMirrorRef} className="relative" style={{ width: axis.widthPx }}>
              {/* the night bands, tappable here too — same strips, same toggle */}
              <BandLayer bands={bands} hidden={hidden} onToggle={onToggleBand} />
              {/* the now-line through the whole bar, run 0.875rem past the
                  bottom so it bridges the gap to the scroller's own line below
                  and reads as one line from pill to the last row */}
              <div
                className="bg-primary absolute inset-y-0 -bottom-3.5 w-[1.5px]"
                style={{ left: now }}
              />
              {/* hour labels */}
              <div className="relative h-6">
                {axis.ticks.map((t) => (
                  <span
                    key={t.label}
                    className={`absolute top-3 font-mono text-[10px] whitespace-nowrap text-white/45 ${
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
                {/* the "now" pill — opaque, so it seams out the line's top */}
                <span
                  className="bg-primary-tint text-primary absolute -top-4 z-[7] block w-max -translate-x-1/2 rounded-md px-1.5 py-px font-mono text-[10px] leading-none font-semibold whitespace-nowrap"
                  style={{ left: now }}
                >
                  {nowLabel}
                </span>
              </div>
              {/* your lane — the line's segment meets the live bar's leading
                  edge, so the lane reads as the line's origin */}
              {you && (
                <div className="flex h-13 items-start pt-6">
                  <RowTrack row={you} />
                </div>
              )}
            </div>
          </div>

          {/* track area — fluid on lg+ when the axis fits (overflow-x-clip trims
              the 1px ruler overhang without becoming a scroll container), scrolls
              when it doesn't. Safe now: nothing sticky lives inside. */}
          <div
            ref={scrollerRef}
            className={`min-w-0 pb-2 ${you ? 'lg:mt-3.5' : ''} ${
              axis.overflow ? 'overflow-x-auto' : 'overflow-x-clip'
            }`}
          >
            <div className="relative min-h-10" style={{ width: axis.widthPx }}>
              {/* the night bands — thin, labelled collapsed strips at both ends.
                  Clicking one grows it to real scale and widens the axis; clicking
                  the slim handle that replaces it folds it back. */}
              <BandLayer bands={bands} hidden={hidden} onToggle={onToggleBand} />

              {/* hour gridlines */}
              {axis.ticks.map((t) => (
                <div
                  key={t.label}
                  className="absolute top-5 bottom-2 w-px bg-white/[0.05]"
                  style={{ left: t.leftPx }}
                />
              ))}

              {/* now-line — every live bar ends here; the bar above draws its own
                  segment, so this one spans the rows only. z-[3]: above the rows
                  (z-[2]), below the pinned bar so it never crosses it. */}
              <div
                className="bg-primary absolute top-0 bottom-1.5 z-[3] w-[1.5px]"
                style={{ left: now }}
              />

              {/* contract: tracks only; the name column is the pinned sibling.
                  a shadcn Popover hangs off each bar (session details) in prod.
                  Your track lives in the pinned bar above; on <lg the mobile
                  lane owns it instead. */}
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
      </div>
    </section>
  )
}

// The night bands, so the desktop track and the pinned mobile mirror render the
// exact same strips and share one toggle.
function BandLayer({
  bands,
  hidden,
  onToggle,
}: {
  bands: { segment: NightBandSegment; offsetPx: number }[]
  hidden: Record<BandSide, number>
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

const BAND_HANDLE_PX = 24

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
