/**
 * Placeholder data for the Today screen — static skeleton, wire to Convex later.
 * Every region's component takes its data as props; this is the single swap point.
 */

export const live = true // you are in a session — flips hero + mobile ordering

export const NOW = 72 // now-line position, % of axis — computed from data in prod

/* ------------------------------------------------------------------ */

export type Presence = {
  initials: string
  color: string
  name: string
  time: string
  now: string | null
}

// contract: who · how long in · what they're on (shared titles only; null = private)
export const presence: Presence[] = [
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

export type Hour = { pct: number; label: string }

// contract: sticky-left axis — first session floored to the hour, right edge grows.
// Full day 06:00–24:00; hourly in prod, every 2h here for skeleton legibility.
export const hours: Hour[] = [
  { pct: 0, label: '06:00' },
  { pct: 11, label: '08:00' },
  { pct: 22, label: '10:00' },
  { pct: 33, label: '12:00' },
  { pct: 44, label: '14:00' },
  { pct: 56, label: '16:00' },
  { pct: 67, label: '18:00' },
  { pct: 78, label: '20:00' },
  { pct: 89, label: '22:00' },
  { pct: 100, label: '24:00' },
]

export type TimelineBar = { left: number; width: number; mode: string; live?: boolean }
export type TimelinePlan = { left: number; width: number; label: string }
export type TimelineRow = {
  name: string
  you?: boolean
  live: boolean
  sub: string
  tail: string
  bars: TimelineBar[]
  plans?: TimelinePlan[]
  dots: number[]
}

// contract: one row per person · one bar per session · dots at doneAt.
// Your row pinned only while live or holding upcoming plans.
export const timeline: TimelineRow[] = [
  {
    name: 'Simon M',
    you: true,
    live: true,
    sub: '1h 32m',
    tail: '#3 · 1h 32m',
    bars: [{ left: 33, width: NOW - 33, mode: 'cam', live: true }],
    plans: [{ left: 78, width: 9, label: 'Problem set 3' }],
    dots: [41],
  },
  {
    name: 'Maya',
    live: true,
    sub: '2h 41m',
    tail: '2h 41m',
    bars: [{ left: 8, width: NOW - 8, mode: 'cam', live: true }],
    dots: [16, 28, 44, 52],
  },
  {
    name: 'Ana',
    live: true,
    sub: '1h 44m',
    tail: '1h 44m',
    bars: [{ left: 21, width: NOW - 21, mode: 'screen', live: true }],
    dots: [30, 42],
  },
  {
    name: 'Leo',
    live: true,
    sub: '1h 23m',
    tail: '1h 23m',
    bars: [{ left: 25, width: NOW - 25, mode: 'voice', live: true }],
    dots: [37],
  },
  {
    name: 'Noor',
    live: true,
    sub: '2h 05m',
    tail: '2h 05m',
    bars: [{ left: 15, width: NOW - 15, mode: 'screen', live: true }],
    dots: [24, 39, 58],
  },
  {
    name: 'Kai',
    live: true,
    sub: '52m',
    tail: '52m',
    bars: [{ left: 58, width: NOW - 58, mode: 'voice', live: true }],
    dots: [63],
  },
  {
    name: 'Priya',
    live: false,
    sub: '1h 40m ×2',
    tail: '1h 40m ×2',
    bars: [
      { left: 6, width: 8, mode: 'cam' },
      { left: 33, width: 12, mode: 'voice' },
    ],
    dots: [8, 38, 45],
  },
  {
    name: 'Tomas',
    live: false,
    sub: '1h 12m',
    tail: '1h 12m',
    bars: [{ left: 12, width: 13, mode: 'voice' }],
    dots: [15, 20],
  },
  {
    name: 'Ben',
    live: false,
    sub: '2h 18m ×2',
    tail: '2h 18m ×2',
    bars: [
      { left: 4, width: 10, mode: 'cam' },
      { left: 30, width: 16, mode: 'voice' },
    ],
    dots: [7, 22, 36, 44],
  },
  {
    name: 'Sofia',
    live: false,
    sub: '1h 55m',
    tail: '1h 55m',
    bars: [{ left: 28, width: 22, mode: 'screen' }],
    dots: [33, 47],
  },
  {
    name: 'Diego',
    live: false,
    sub: '1h 07m ×2',
    tail: '1h 07m ×2',
    bars: [
      { left: 10, width: 9, mode: 'voice' },
      { left: 40, width: 11, mode: 'cam' },
    ],
    dots: [13, 45],
  },
  {
    name: 'Hana',
    live: false,
    sub: '3h 02m',
    tail: '3h 02m',
    bars: [{ left: 20, width: 28, mode: 'cam' }],
    dots: [26, 34, 41, 48, 55, 60],
  },
]

export type WeekDay = { label: string; hrs?: string; h?: number; today?: boolean }

// contract: room focus per day · today's bar grows live
export const week: WeekDay[] = [
  { label: 'Mon 13', hrs: '6h 52m', h: 78 },
  { label: 'Tue 14', hrs: '13h 20m', h: 100, today: true },
  { label: 'Wed 15', hrs: '—' },
  { label: 'Thu 16', hrs: '—' },
  { label: 'Fri 17', hrs: '—' },
  { label: 'Sat 18', hrs: '—' },
  { label: 'Sun 19', hrs: '—' },
]

export type BoardRow = {
  rank: number
  initials: string
  color: string
  name: string
  total: string
  streak: string
  you?: boolean
}

// contract: ranked by streak (never hours) · top 3 + you + the rest of the room
export const board: BoardRow[] = [
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
  { rank: 4, initials: 'A', color: '#e89aa6', name: 'Ana', total: '3h 12m', streak: '8d' },
  { rank: 5, initials: 'L', color: '#8fd9c9', name: 'Leo', total: '2h 58m', streak: '5d' },
  { rank: 6, initials: 'K', color: '#e8c07a', name: 'Kai', total: '2h 41m', streak: '7d' },
  { rank: 7, initials: 'P', color: '#b3a7e8', name: 'Priya', total: '2h 20m', streak: '4d' },
  { rank: 8, initials: 'N', color: '#e0a1c4', name: 'Noor', total: '2h 04m', streak: '3d' },
  { rank: 9, initials: 'T', color: '#8fb8d9', name: 'Tomas', total: '1h 52m', streak: '6d' },
  { rank: 10, initials: 'D', color: '#8fd9c9', name: 'Dana', total: '1h 44m', streak: '2d' },
  { rank: 11, initials: 'O', color: '#d9a05b', name: 'Omar', total: '1h 31m', streak: '5d' },
  { rank: 12, initials: 'I', color: '#e89aa6', name: 'Ivy', total: '1h 18m', streak: '3d' },
  { rank: 13, initials: 'R', color: '#e8c07a', name: 'Ravi', total: '1h 05m', streak: '2d' },
]

// same room, month-to-date — the Consistency board's Month tab. Ranked by streak
// (unchanged), so the order holds and only the hours differ from the week board.
export const monthBoard: BoardRow[] = [
  { rank: 1, initials: 'M', color: '#b3a7e8', name: 'Maya', total: '27h 40m', streak: '12d' },
  {
    rank: 2,
    initials: 'S',
    color: '#8fb8d9',
    name: 'starbuckswifi',
    total: '22h 15m',
    streak: '9d',
  },
  {
    rank: 3,
    initials: 'S',
    color: '#d9a05b',
    name: 'Simon M',
    total: '14h 05m',
    streak: '6d',
    you: true,
  },
  { rank: 4, initials: 'A', color: '#e89aa6', name: 'Ana', total: '12h 48m', streak: '8d' },
  { rank: 5, initials: 'L', color: '#8fd9c9', name: 'Leo', total: '11h 52m', streak: '5d' },
  { rank: 6, initials: 'K', color: '#e8c07a', name: 'Kai', total: '10h 44m', streak: '7d' },
  { rank: 7, initials: 'P', color: '#b3a7e8', name: 'Priya', total: '9h 20m', streak: '4d' },
  { rank: 8, initials: 'N', color: '#e0a1c4', name: 'Noor', total: '8h 16m', streak: '3d' },
  { rank: 9, initials: 'T', color: '#8fb8d9', name: 'Tomas', total: '7h 28m', streak: '6d' },
  { rank: 10, initials: 'D', color: '#8fd9c9', name: 'Dana', total: '6h 56m', streak: '2d' },
  { rank: 11, initials: 'O', color: '#d9a05b', name: 'Omar', total: '6h 04m', streak: '5d' },
  { rank: 12, initials: 'I', color: '#e89aa6', name: 'Ivy', total: '5h 12m', streak: '3d' },
  { rank: 13, initials: 'R', color: '#e8c07a', name: 'Ravi', total: '4h 20m', streak: '2d' },
]

export type Task = {
  txt: string
  done?: boolean
  doneAt?: string
  active?: boolean
  planned?: string | null
  shared: boolean
}

// contract: done/doneAt · plannedAt · activeSince · shared (owner-only list)
export const tasks: Task[] = [
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

// contract: levels 0–4 derived from dailyTotals · today = todayIndex
export const heat = [
  0, 1, 0, 2, 1, 0, 1, 2, 3, 2, 1, 2, 3, 2, 1, 3, 2, 0, 1, 2, 4, 3, 2, 1, 2, 3, 4, 2, 1, 2, 1,
]

export const nowTask = 'Anki deck: German irregular verbs ×40'

export type Hero =
  | {
      live: true
      h: string
      m: string
      s: string
      now: string
      others: number
      roomToday: string
      rank: string
    }
  | { live: false; together: number; openedAt: string; streak: string }

export const hero: Hero = live
  ? {
      live: true,
      h: '1',
      m: '32',
      s: '40',
      now: nowTask,
      others: 4,
      roomToday: '13h 20m',
      rank: '#3',
    }
  : { live: false, together: 5, openedAt: '12:16', streak: '6d' }

export const you = {
  initials: 'S',
  color: '#d9a05b',
  name: 'Simon M',
  sub: '#3 today · 6d streak',
}

export const month = { name: 'October', streak: '6d', todayIndex: 13 }

export const quote = 'Discipline is just love for your future self.'

/* ------------------------------------------------------------------ */
/* shared visual helpers                                               */
/* ------------------------------------------------------------------ */

/** section-label pattern — promote to the `.text-label` utility when tokens land */
export const label =
  'text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle-foreground'

/** live bar quality per Discord mode — visual only, never a statistic */
export const segLive: Record<string, string> = {
  cam: 'bg-primary shadow-[0_0_9px_rgb(52_211_153/0.35)]', // glow → token
  screen:
    'bg-[repeating-linear-gradient(-55deg,rgb(52_211_153/0.85)_0_4px,rgb(52_211_153/0.3)_4px_8px)]',
  voice: 'bg-primary/40',
  page: 'bg-primary/10 border border-primary/55',
}

export const segEnded: Record<string, string> = {
  cam: 'bg-white/[0.14]',
  screen: 'bg-white/[0.14]',
  voice: 'bg-white/[0.08]',
  page: 'bg-transparent border border-white/20',
}

export const heatLevel = [
  '',
  'bg-primary/[0.09]',
  'bg-primary/[0.18]',
  'bg-primary/30 text-white/55',
  'bg-primary/[0.48] text-white/70',
]
