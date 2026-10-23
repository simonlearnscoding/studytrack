/**
 * Placeholder data for the Today screen. The room, the consistency board and the
 * task queue are live from Convex; the remaining regions still read their mock
 * values from here.
 */

/* ------------------------------------------------------------------ */

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

// Hero stats — the room figure is a mock constant; the Now task and the session
// clock come from the live queue and tracking status.
export const heroIdle = { together: 5, openedAt: '12:16', streak: '6d' }

export const you = {
  initials: 'S',
  color: '#d9a05b',
  name: 'Simon M',
  sub: '#3 today · 6d streak',
}

/* ------------------------------------------------------------------ */
/* shared visual helpers                                               */
/* ------------------------------------------------------------------ */

/** section-label pattern — promote to the `.text-label` utility when tokens land */
export const label =
  'text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle-foreground'

/** minutes → `6h 50m` / `45m` — mono duration for the boards */
export function fmtHrs(mins: number): string {
  const h = Math.floor(mins / 60)
  if (!h) return `${mins}m`
  return `${h}h ${String(mins % 60).padStart(2, '0')}m`
}
