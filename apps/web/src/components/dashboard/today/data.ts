/**
 * Placeholder data for the Today screen — static skeleton, wire to Convex later.
 * Every region's component takes its data as props; this is the single swap point.
 */

export const live = true // you are in a session — flips hero + mobile ordering

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

export const heatLevel = [
  '',
  'bg-primary/[0.09]',
  'bg-primary/[0.18]',
  'bg-primary/30 text-white/55',
  'bg-primary/[0.48] text-white/70',
]
