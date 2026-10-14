/**
 * TodayLayout — port of the approved "floating page" mock.
 * Layout skeleton only: static placeholders, no queries, no state machines.
 * Data contracts marked per region — wire to Convex later.
 *
 * Tailwind rule used: theme scale where the mock delta is ≤1px (invisible);
 * arbitrary values only for identity: hero size, label pattern, timeline
 * grids, screen-share hatch, glow, 1.5px now-line, micro-type (8–11px).
 * Micro-type consolidated: 8 / 9 / 10 / 11px arbitrary · 12px+ → text-xs /
 * text-sm / text-lg.
 *
 * Mobile (<lg): single column — taskpane first when live, room first when
 * out. NOW-bar + bottom sheet are separate mobile components, not this file
 * (bottom padding on the root reserves their space).
 */

import { Eye, Lock, Play, Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Input } from '~/components/ui/input'

/* ------------------------------------------------------------------ */
/* placeholder data — replace with useQuery results                    */
/* ------------------------------------------------------------------ */

const live = true // you are in a session — flips hero + mobile ordering

const NOW = 72 // now-line position, % of axis — computed from data in prod

const presence = [
  // contract: who · how long in · what they're on (shared titles only; null = private)
  { initials: 'M', color: '#b3a7e8', name: 'Maya', time: '2h 07m', now: '▸ Problem set 6' },
  { initials: 'A', color: '#e89aa6', name: 'Ana', time: '1h 44m', now: '▸ Read 2 papers' },
  {
    initials: 'L',
    color: '#8fd9c9',
    name: 'Leo',
    time: '1h 23m',
    now: 'next · System design notes',
  },
  { initials: 'K', color: '#e8c07a', name: 'Kai', time: '45m', now: '→ 15:15 Chapter 5 exercises' },
  { initials: 'N', color: '#e0a1c4', name: 'Noor', time: '29m', now: null },
]

const hours = [
  // contract: sticky-left axis — first session floored to the hour, right edge grows.
  // Hourly in prod; every 2h here for skeleton legibility.
  { pct: 0, label: '07:00' },
  { pct: 17, label: '09:00' },
  { pct: 33, label: '11:00' },
  { pct: 50, label: '13:00' },
  { pct: 67, label: '15:00' },
  { pct: 83, label: '17:00' },
  { pct: 100, label: '19:00' },
]

type TimelineBar = { left: number; width: number; mode: string; live?: boolean }
type TimelinePlan = { left: number; width: number; label: string }
type TimelineRow = {
  name: string
  you?: boolean
  live: boolean
  sub: string
  tail: string
  bars: TimelineBar[]
  plans?: TimelinePlan[]
  dots: number[]
}

const timeline: TimelineRow[] = [
  // contract: one row per person · one bar per session · dots at doneAt.
  // Your row pinned only while live or holding upcoming plans.
  {
    name: 'Simon M',
    you: true,
    live: true,
    sub: '1h 32m · 2✓',
    tail: '#3 · 1h 32m · 2✓',
    bars: [{ left: 33, width: NOW - 33, mode: 'cam', live: true }],
    plans: [{ left: 78, width: 9, label: 'Problem set 3' }],
    dots: [41],
  },
  {
    name: 'Maya',
    live: true,
    sub: '2h 41m · 5✓',
    tail: '2h 41m · 5✓',
    bars: [{ left: 8, width: NOW - 8, mode: 'cam', live: true }],
    dots: [16, 28, 44, 52],
  },
  {
    name: 'Ana',
    live: true,
    sub: '1h 44m · 2✓',
    tail: '1h 44m · 2✓',
    bars: [{ left: 21, width: NOW - 21, mode: 'screen', live: true }],
    dots: [30, 42],
  },
  {
    name: 'Leo',
    live: true,
    sub: '1h 23m · 1✓',
    tail: '1h 23m · 1✓',
    bars: [{ left: 25, width: NOW - 25, mode: 'voice', live: true }],
    dots: [37],
  },
  {
    name: 'Priya',
    live: false,
    sub: '1h 40m · 3✓ ×2',
    tail: '1h 40m · 3✓ ×2',
    bars: [
      { left: 6, width: 8, mode: 'cam' },
      { left: 33, width: 12, mode: 'voice' },
    ],
    dots: [8, 38, 45],
  },
  {
    name: 'Tomas',
    live: false,
    sub: '1h 12m · 2✓',
    tail: '1h 12m · 2✓',
    bars: [{ left: 12, width: 13, mode: 'voice' }],
    dots: [15, 20],
  },
]

type WeekDay = { label: string; hrs?: string; h?: number; today?: boolean }

const week: WeekDay[] = [
  // contract: room focus per day · today's bar grows live
  { label: 'Mon 13', hrs: '6h 52m', h: 78 },
  { label: 'Tue 14', hrs: '13h 20m', h: 100, today: true },
  { label: 'Wed 15', hrs: '—' },
  { label: 'Thu 16', hrs: '—' },
  { label: 'Fri 17', hrs: '—' },
  { label: 'Sat 18', hrs: '—' },
  { label: 'Sun 19', hrs: '—' },
]

type BoardRow = {
  rank: number
  initials: string
  color: string
  name: string
  total: string
  streak: string
  you?: boolean
}

const board: BoardRow[] = [
  // contract: ranked by streak (never hours) · top 3 + you
  { rank: 1, initials: 'M', color: '#b3a7e8', name: 'Maya', total: '6h 50m', streak: '12d' },
  {
    rank: 2,
    initials: 'S',
    color: '#8fb8d9',
    name: 'starbuckswifi',
    total: '5h 33m',
    streak: '9d',
  },
  {
    rank: 3,
    initials: 'S',
    color: '#d9a05b',
    name: 'Simon M',
    total: '3h 27m',
    streak: '6d',
    you: true,
  },
]

type Task = {
  txt: string
  done?: boolean
  doneAt?: string
  active?: boolean
  planned?: string | null
  shared: boolean
}

const tasks: Task[] = [
  // contract: done/doneAt · plannedAt · activeSince · shared (owner-only list)
  {
    txt: 'Read chapter 4 — Kant, the categorical imperative',
    done: true,
    doneAt: '13:48',
    shared: true,
  },
  { txt: 'Anki deck: German irregular verbs ×40', active: true, shared: true },
  { txt: 'Problem set 3, questions 1–6', planned: '15:00', shared: true },
  { txt: 'Draft essay outline + thesis statement', shared: false },
]

const heat = [
  // contract: levels 0–4 derived from dailyTotals · today = index 13
  0, 1, 0, 2, 1, 0, 1, 2, 3, 2, 1, 2, 3, 2, 1, 3, 2, 0, 1, 2, 4, 3, 2, 1, 2, 3, 4, 2, 1, 2, 1,
]

/* ------------------------------------------------------------------ */
/* shared bits                                                         */
/* ------------------------------------------------------------------ */

/** section-label pattern — promote to the `.text-label` utility when tokens land */
const label = 'text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle-foreground'

/** live bar quality per Discord mode — visual only, never a statistic */
const segLive: Record<string, string> = {
  cam: 'bg-primary shadow-[0_0_9px_rgb(52_211_153/0.35)]', // glow → token
  screen:
    'bg-[repeating-linear-gradient(-55deg,rgb(52_211_153/0.85)_0_4px,rgb(52_211_153/0.3)_4px_8px)]',
  voice: 'bg-primary/40',
  page: 'bg-primary/10 border border-primary/55',
}
const segEnded: Record<string, string> = {
  cam: 'bg-white/[0.14]',
  screen: 'bg-white/[0.14]',
  voice: 'bg-white/[0.08]',
  page: 'bg-transparent border border-white/20',
}
const heatLevel = [
  '',
  'bg-primary/[0.09]',
  'bg-primary/[0.18]',
  'bg-primary/30 text-white/55',
  'bg-primary/[0.48] text-white/70',
]

const avatarSize = { 24: 'h-6 w-6 text-[10px]', 30: 'h-8 w-8 text-xs', 34: 'h-9 w-9 text-xs' }

function Avatar({
  initials,
  color,
  size = 30,
  dot = false,
}: {
  initials: string
  color: string
  size?: 24 | 30 | 34
  dot?: boolean
}) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-full font-semibold ${avatarSize[size]}`}
      style={{ background: `${color}26`, color }}
    >
      {initials}
      {/* status dot — you cut this in the shell round; delete the next line if it stays cut */}
      {dot && (
        <span className="border-background bg-primary absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border-2" />
      )}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* layout                                                              */
/* ------------------------------------------------------------------ */

export function TodayLayout() {
  return (
    <div
      className="mx-auto flex max-lg:min-h-dvh max-lg:flex-col max-lg:gap-5
                    max-lg:px-3.5 max-lg:py-3.5 max-lg:pb-[calc(6.5rem+env(safe-area-inset-bottom))]
                    lg:h-dvh lg:max-w-[1560px] lg:flex-col lg:gap-4 lg:p-5 lg:px-6 lg:pb-6"
    >
      {/* ================= header ================= */}
      <header className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-baseline">
          <span className={`${label} tracking-[0.18em]`}>Tuesday, October 14</span>
          <h1 className="ml-3 text-lg font-semibold max-lg:ml-2.5">Today</h1>
        </div>
        {/* real app: session controls (start/stop tracking) live here */}
        <div className="text-muted-foreground flex items-center gap-2 text-xs">controls</div>
      </header>

      {/* ================= lanes ================= */}
      <div
        className="grid min-h-0 flex-1 gap-6
                      max-lg:flex max-lg:flex-col
                      lg:grid-cols-[minmax(180px,240px)_minmax(0,1fr)_minmax(300px,336px)]"
      >
        {/* ---------- left · presence ---------- */}
        <aside
          className={`flex min-h-0 flex-col lg:order-none ${live ? 'max-lg:order-2' : 'max-lg:order-1'}`}
        >
          <div className={`flex items-center gap-2 pb-2.5 pl-0.5 ${label}`}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" />
              <span className="bg-primary relative inline-flex h-1.5 w-1.5 rounded-full" />
            </span>
            In the room
            <span className="text-muted-foreground tracking-normal">· {presence.length}</span>
          </div>

          {/* contract: live users in join order · horizontal chips on mobile */}
          <div
            className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-0.5
                          max-lg:flex-row max-lg:overflow-x-auto max-lg:overflow-y-hidden"
          >
            {presence.map((p) => (
              <div
                key={p.name}
                className="bg-card rounded-xl border px-3 py-2.5 max-lg:w-[10.5rem] max-lg:shrink-0"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar initials={p.initials} color={p.color} dot />
                  <p className="min-w-0 flex-1 truncate text-xs font-medium">{p.name}</p>
                  <span className="text-primary font-mono text-xs font-medium">{p.time}</span>
                </div>
                <p className="text-subtle-foreground mt-1.5 flex items-center gap-1 truncate text-[11px]">
                  {p.now === null && <Lock className="h-2.5 w-2.5 shrink-0" />}
                  {p.now ?? 'private list'}
                </p>
              </div>
            ))}
          </div>
        </aside>

        {/* ---------- center · hero → timeline → week → board ---------- */}
        <main
          className={`flex min-h-0 flex-col gap-6 max-lg:gap-5 max-lg:overflow-visible lg:overflow-y-auto ${live ? 'max-lg:order-3' : 'max-lg:order-2'}`}
        >
          {/* hero — your timer when live · the door when out */}
          {live ? (
            <section className="flex items-center gap-6 max-lg:gap-4">
              <div>
                {/* contract: single clock with seconds — yours; everyone else ticks per minute */}
                <div className="font-mono text-[44px] leading-none font-medium tracking-tight max-lg:text-[32px]">
                  1<span className="text-subtle-foreground text-[0.62em]">h </span>32
                  <span className="text-subtle-foreground text-[0.62em]">m </span>40
                  <span className="text-subtle-foreground text-[0.62em]">s</span>
                </div>
                <p className="text-subtle-foreground mt-1 text-xs">your session</p>
              </div>
              <p className="text-muted-foreground mt-1.5 text-xs">
                with <b className="text-foreground font-medium">4 others</b> · room 13h 20m today ·{' '}
                <span className="text-primary">#3</span>
              </p>
            </section>
          ) : (
            <section className="flex items-center gap-4">
              <Button className="border-primary/35 bg-primary-tint text-primary hover:bg-primary/[0.22] gap-2 rounded-xl font-semibold">
                <Play className="h-3.5 w-3.5 fill-current" /> Start tracking
              </Button>
              <p className="text-muted-foreground text-xs">
                <b className="text-foreground font-medium">5 studying together</b> · room opened
                12:16 · 6d streak on the line
              </p>
            </section>
          )}

          {/* timeline — the hero component of the page */}
          <section>
            <div className={`flex flex-wrap items-center gap-2.5 pl-0.5 ${label}`}>
              Today&apos;s sessions
              <div className="ml-auto flex flex-wrap gap-2.5 text-[9px] tracking-normal text-white/30 normal-case max-lg:ml-0 max-lg:pt-1">
                <span>
                  <i className="bg-primary mr-1 inline-block h-1 w-3 rounded-full align-[-1px]" />
                  cam
                </span>
                <span>
                  <i
                    className={`mr-1 inline-block h-1 w-3 rounded-full align-[-1px] ${segLive.screen}`}
                  />
                  screen
                </span>
                <span>
                  <i className="bg-primary/40 mr-1 inline-block h-1 w-3 rounded-full align-[-1px]" />
                  voice
                </span>
                <span>
                  <i className="border-primary/55 bg-primary/10 mr-1 inline-block h-1.5 w-3 rounded-[2px] border align-[-2px]" />
                  tracked
                </span>
                <span>
                  <i className="border-primary/55 mr-1 inline-block h-[7px] w-3 rounded-[2px] border border-dashed align-[-2px]" />
                  planned
                </span>
                <span>
                  <i className="border-primary/75 bg-background mr-1 inline-block h-1.5 w-1.5 rounded-full border-[1.5px] align-[-1px]" />
                  done
                </span>
              </div>
            </div>

            <div className="relative mt-4 overflow-x-auto pt-6 pb-2 max-lg:-mx-3.5 max-lg:px-3.5">
              <div className="relative min-w-[40rem]">
                {/* hour ruler */}
                {hours.map((h) => (
                  <div
                    key={h.label}
                    className="absolute top-5 bottom-2 w-px bg-white/[0.05]"
                    style={{ left: `${h.pct}%` }}
                  >
                    <span className="absolute -top-5 -translate-x-1/2 font-mono text-[10px] text-white/30">
                      {h.label}
                    </span>
                  </div>
                ))}

                {/* now-line — every live bar ends here */}
                <div
                  className="bg-primary absolute -top-0.5 bottom-1.5 z-10 w-[1.5px]"
                  style={{ left: `${NOW}%` }}
                >
                  <span className="bg-primary-tint text-primary absolute -top-4 -translate-x-1/2 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap">
                    now · 14:23
                  </span>
                </div>

                {/* contract: rows attach shadcn Popover per bar (session details) ·
                    click on your empty track opens the plan popover */}
                <div className="relative z-[2] flex flex-col gap-3.5">
                  {timeline.map((row) => (
                    <div
                      key={row.name}
                      className={`grid items-center gap-3 max-lg:grid-cols-[84px_1fr] max-lg:gap-2.5 lg:grid-cols-[146px_1fr_118px] ${row.you ? 'my-3.5' : ''}`}
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        {row.live && (
                          <span className="bg-primary h-1.5 w-1.5 shrink-0 animate-pulse rounded-full" />
                        )}
                        <p
                          className={`truncate text-xs ${row.live ? 'text-white/80' : 'text-white/35'}`}
                        >
                          {row.name}
                        </p>
                        {row.you && (
                          <span className="border-primary/30 text-primary shrink-0 rounded border px-1 text-[9px] tracking-wider">
                            you
                          </span>
                        )}
                        {/* mobile stand-in for the tail column */}
                        <span className="text-subtle-foreground hidden w-full font-mono text-[9px] max-lg:block">
                          {row.sub}
                        </span>
                      </div>

                      <div className="relative min-w-0">
                        {/* planned blocks — your row only, never shipped to other clients */}
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

                        <div
                          className={`relative rounded-full bg-white/[0.035] ${row.you ? 'h-3 cursor-crosshair' : 'h-2.5'}`}
                        >
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
                        </div>

                        {row.you && (
                          <span className="pointer-events-none absolute right-0 -bottom-4 font-mono text-[9px] text-white/25">
                            tap empty time to plan
                          </span>
                        )}
                      </div>

                      <span className="text-subtle-foreground hidden text-right font-mono text-[10px] lg:block">
                        {row.you && (
                          <span className="text-primary">{row.tail.split(' · ')[0]}</span>
                        )}
                        {row.you ? ' · ' + row.tail.split(' · ').slice(1).join(' · ') : row.tail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* week — day bars · you cut this graph in the shell round; delete section to keep the cut */}
          <section className="border-t border-white/[0.05] pt-4 max-lg:border-0 max-lg:pt-0">
            <div className={`flex items-center pl-0.5 ${label}`}>
              This week
              <span className="text-muted-foreground ml-1 tracking-normal">
                · room focus per day
              </span>
              <span className="text-muted-foreground ml-auto font-mono text-[10px] tracking-normal">
                room 19h 05m
              </span>
            </div>
            <div className="mt-2 flex gap-2.5 max-lg:gap-1.5">
              {week.map((d) => (
                <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-20 w-full items-end justify-center max-lg:h-14">
                    {d.h ? (
                      <div
                        className={`w-[58%] rounded-t-md ${d.today ? 'bg-primary shadow-[0_0_12px_rgb(52_211_153/0.3)]' : 'bg-white/[0.16]'}`}
                        style={{ height: `${d.h}%` }}
                      />
                    ) : (
                      <div className="h-[3px] w-[58%] rounded-md border border-dashed border-white/[0.12]" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] tracking-wide ${d.today ? 'text-foreground' : 'text-subtle-foreground'}`}
                  >
                    {d.label}
                  </span>
                  <span
                    className={`font-mono text-[9px] ${d.today ? 'text-primary' : 'text-white/30'}`}
                  >
                    {d.hrs}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* consistency — the leaderboard, ranked by streak not hours */}
          <section>
            <div className={`flex items-center pl-0.5 ${label}`}>
              Consistency
              <span className="text-muted-foreground ml-1 tracking-normal">· by streak</span>
            </div>
            {board.map((b) => (
              <div
                key={b.name}
                className={`grid items-center gap-3 border-b border-white/[0.04] px-1.5 py-1.5 max-lg:grid-cols-[18px_24px_1fr_44px_36px] max-lg:gap-2 lg:grid-cols-[20px_26px_minmax(90px,1fr)_96px_52px] ${b.you ? 'bg-primary/5 rounded-lg' : ''}`}
              >
                <span className="text-subtle-foreground font-mono text-[10px]">#{b.rank}</span>
                <Avatar initials={b.initials} color={b.color} size={24} />
                <p className="truncate text-xs text-white/70">
                  {b.name}
                  {b.you && <span className="text-primary ml-1.5 text-[9px]">you</span>}
                </p>
                <span className="text-muted-foreground text-right font-mono text-[11px]">
                  {b.total}
                </span>
                <span className="text-muted-foreground text-right font-mono text-[11px]">
                  {b.streak}
                </span>
              </div>
            ))}
            <p className="px-1.5 pt-2 text-[11px] text-white/25">+5 others</p>
          </section>
        </main>

        {/* ---------- right · tasks ---------- */}
        <aside
          className={`flex min-h-0 flex-col gap-4 max-lg:overflow-visible lg:order-none lg:overflow-y-auto ${live ? 'max-lg:order-1' : 'max-lg:hidden'}`}
        >
          {/* task pane — merged you-card: header carries your state */}
          <section className="bg-card flex min-h-0 flex-1 flex-col rounded-xl border p-4 max-lg:p-3.5">
            <div className="flex items-center gap-2.5 pb-3">
              <Avatar initials="S" color="#d9a05b" size={34} dot />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Simon M</p>
                <p className="text-subtle-foreground text-[11px]">#3 today · 6d streak</p>
              </div>
            </div>

            {/* NOW box — active task · ask state · or play state when out */}
            <div className="border-primary/25 bg-primary/[0.06] mb-2.5 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5 text-xs">
              <span className="bg-primary-tint text-primary rounded px-1 py-0.5 font-mono text-[9px] tracking-widest">
                NOW
              </span>
              <span className="text-primary/90">Anki deck: German irregular verbs ×40</span>
            </div>

            {/* contract: tap row = set active · checkbox = complete · eye = share toggle */}
            <div className="min-h-0 flex-1 overflow-y-auto max-lg:overflow-visible">
              {tasks.map((t) => (
                <div
                  key={t.txt}
                  className={`flex cursor-pointer items-start gap-2.5 border-b border-white/[0.04] px-2 py-2.5 last:border-0 ${t.active ? 'bg-primary/[0.06] rounded-md' : ''}`}
                >
                  <Checkbox checked={!!t.done} className="mt-0.5 h-5 w-5 rounded-md" />
                  <p
                    className={`min-w-0 flex-1 text-sm leading-normal ${t.done ? 'text-subtle-foreground line-through' : 'text-white/85'}`}
                  >
                    {t.active && (
                      <span className="bg-primary-tint text-primary mr-1.5 rounded px-1 py-0.5 align-[1px] font-mono text-[9px] tracking-widest">
                        NOW
                      </span>
                    )}
                    {t.txt}
                    {t.planned && (
                      <span className="bg-primary-tint text-primary ml-1.5 rounded px-1 align-[1px] font-mono text-[9px]">
                        → {t.planned}
                      </span>
                    )}
                    {t.doneAt && (
                      <span className="text-subtle-foreground ml-1.5 font-mono text-[9px]">
                        {t.doneAt}
                      </span>
                    )}
                  </p>
                  <Eye
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${t.shared ? 'text-primary' : 'text-muted-foreground/40'}`}
                  />
                </div>
              ))}
            </div>

            {/* composer */}
            <div className="mt-3 flex gap-2">
              <Input placeholder="Add a task…" className="h-9 rounded-lg text-sm" />
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-lg">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </section>

          {/* month — rail placement per the rolled-back mock (shell round moved it to a reference band) */}
          <section className="bg-card rounded-xl border p-4 max-lg:p-3.5">
            <div className="flex items-baseline gap-2 pb-2.5">
              <span className={label}>October</span>
              <b className="font-mono text-xs font-medium">6d streak</b>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span
                  key={i}
                  className="text-center text-[8px] tracking-wider text-white/25 uppercase"
                >
                  {d}
                </span>
              ))}
              {heat.map((v, i) => (
                <div
                  key={i}
                  className={`flex aspect-[1.5] items-end rounded-md border border-white/[0.04] p-1 font-mono text-[8px] text-white/25 ${heatLevel[v]} ${i === 13 ? 'ring-primary text-primary ring-1' : ''} ${i > 13 ? 'border-dashed opacity-45' : ''}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </section>

          {/* quote — you cut this in the shell round; delete to keep the cut */}
          <p className="border-primary/30 border-l-2 py-1 pl-3.5 font-serif text-sm leading-relaxed text-white/40 italic">
            Discipline is just love for your future self.
          </p>
        </aside>
      </div>
    </div>
  )
}
