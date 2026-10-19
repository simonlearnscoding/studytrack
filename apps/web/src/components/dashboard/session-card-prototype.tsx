// PROTOTYPE — throwaway, do not ship. Settles ST-18: what the per-person Session
// card looks like and where it lives in the Focus view. Three structural
// variants, switchable via `?variant=A|B|C` and the floating bottom bar.
// Delete this file and the `?variant` branch in routes/beta.tsx when ST-18
// resolves.
import type { DashboardMember } from '@studytrack/backend/convex/sessions/types'
import { formatDuration } from '@studytrack/backend/convex/sessions/util'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '~/lib/utils'
import { MODE_BAR, MODE_LABEL } from './mode-colors'

// Stub task data — the real per-session task titles arrive with ST-22. Until
// then every card pretends, so the layout is what you are judging.
const STUB_OPEN = ['Physics — chapter 4', 'Essay outline', 'Anki review']
const STUB_DONE_TODAY = 3

type Props = {
  members: DashboardMember[]
  dayStart: number
  now: number
  variant: string
  onSwitch: (next: string) => void
}

const VARIANTS = ['A', 'B', 'C'] as const

export function SessionCardPrototype({ members, dayStart, now, variant, onSwitch }: Props) {
  const online = members.filter((m) => m.online)

  return (
    <div className="min-h-dvh px-4 py-8 sm:px-6">
      {variant === 'A' && <VariantA online={online} members={members} now={now} />}
      {variant === 'B' && <VariantB online={online} members={members} now={now} />}
      {variant === 'C' && <VariantC members={members} now={now} />}
      <PrototypeSwitcher current={variant} onSwitch={onSwitch} />
    </div>
  )
}

// A: horizontal strip of compact cards on top, unified list below.
function VariantA({
  online,
  members,
  now,
}: {
  online: DashboardMember[]
  members: DashboardMember[]
  now: number
}) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-label">In a session now</h2>
        {online.length === 0 ? (
          <p className="text-sm text-muted-foreground/70">No one is in a session right now.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {online.map((m) => (
              <CompactCard key={m.discordId} member={m} now={now} />
            ))}
          </div>
        )}
      </section>
      <UnifiedList members={members} now={now} />
    </div>
  )
}

// B: sessions as the hero — big, full-width, top-centre — list below as a dense table.
function VariantB({
  online,
  members,
  now,
}: {
  online: DashboardMember[]
  members: DashboardMember[]
  now: number
}) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col items-center gap-3">
        <p className="text-label">
          <span className="font-semibold text-foreground tabular-nums">{online.length}</span>{' '}
          {online.length === 1 ? 'person' : 'people'} studying now
        </p>
        <div className="flex w-full max-w-2xl flex-col gap-4">
          {online.map((m) => (
            <HeroCard key={m.discordId} member={m} now={now} />
          ))}
        </div>
      </section>
      <UnifiedList members={members} now={now} />
    </div>
  )
}

// C: no separate strip — the online rows in the unified list expand into full cards.
function VariantC({ members, now }: { members: DashboardMember[]; now: number }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-label">Today</h2>
      {members.map((m) =>
        m.online ? (
          <InlineCard key={m.discordId} member={m} now={now} />
        ) : (
          <Row key={m.discordId} member={m} />
        )
      )}
    </div>
  )
}

// --- shared leaf pieces (a card's contents) ---

function currentMode(member: DashboardMember): keyof typeof MODE_LABEL {
  const partials = member.sessions
    .flatMap((s) => s.partials)
    .sort((a, b) => a.startedAt - b.startedAt)
  const last = [...partials].reverse().find((p) => p.mode !== 'break')
  return last?.mode ?? 'voice'
}

function currentElapsed(member: DashboardMember, now: number): number | null {
  const active = member.sessions.find((s) => s.status === 'active')
  return active ? now - active.startedAt : null
}

function name(member: DashboardMember) {
  return member.name ?? member.discordId
}

function Avatar({ member }: { member: DashboardMember }) {
  if (member.image) {
    return (
      <img
        src={member.image}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-border"
      />
    )
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium uppercase text-muted-foreground ring-1 ring-border">
      {name(member).slice(0, 2)}
    </span>
  )
}

function ModeChip({ member }: { member: DashboardMember }) {
  const mode = currentMode(member)
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <span className={cn('h-1.5 w-1.5 rounded-full', MODE_BAR[mode])} />
      {MODE_LABEL[mode]}
    </span>
  )
}

function TaskLines({ open, done }: { open: string[]; done: number }) {
  return (
    <div className="flex flex-col gap-1">
      {open.map((t) => (
        <p key={t} className="truncate text-sm text-foreground/90">
          {t}
        </p>
      ))}
      <p className="text-xs text-muted-foreground">{done} done today</p>
    </div>
  )
}

// --- variant card shapes ---

function CompactCard({ member, now }: { member: DashboardMember; now: number }) {
  const elapsed = currentElapsed(member, now)
  return (
    <article className="w-64 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar member={member} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{name(member)}</p>
          {elapsed !== null && (
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatDuration(elapsed)}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3">
        <ModeChip member={member} />
      </div>
      <div className="mt-3">
        <TaskLines open={STUB_OPEN} done={STUB_DONE_TODAY} />
      </div>
    </article>
  )
}

function HeroCard({ member, now }: { member: DashboardMember; now: number }) {
  const elapsed = currentElapsed(member, now)
  return (
    <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Avatar member={member} />
        <div className="min-w-0 flex-1">
          <p className="text-title truncate text-foreground">{name(member)}</p>
          <div className="mt-1 flex items-center gap-2">
            <ModeChip member={member} />
            {elapsed !== null && (
              <span className="font-mono text-sm tabular-nums text-muted-foreground">
                {formatDuration(elapsed)} in
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <TaskLines open={STUB_OPEN} done={STUB_DONE_TODAY} />
      </div>
    </article>
  )
}

function InlineCard({ member, now }: { member: DashboardMember; now: number }) {
  const elapsed = currentElapsed(member, now)
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar member={member} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{name(member)}</span>
            <OnlineDot />
          </div>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <ModeChip member={member} />
            {elapsed !== null && (
              <span className="font-mono tabular-nums">{formatDuration(elapsed)}</span>
            )}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <TaskLines open={STUB_OPEN} done={STUB_DONE_TODAY} />
      </div>
    </article>
  )
}

function Row({ member }: { member: DashboardMember }) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
      <Avatar member={member} />
      <span className="truncate text-sm font-medium text-foreground">{name(member)}</span>
    </article>
  )
}

function OnlineDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 motion-reduce:hidden" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
    </span>
  )
}

// --- unified today list (shared by A and B) ---

function UnifiedList({ members, now }: { members: DashboardMember[]; now: number }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-label">Today</h2>
      <div className="flex flex-col gap-3">
        {members.map((m) => (
          <article
            key={m.discordId}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
          >
            <Avatar member={m} />
            <span className="truncate text-sm font-medium text-foreground">{name(m)}</span>
            {m.online && <OnlineDot />}
            <span className="ml-auto font-mono text-sm tabular-nums text-muted-foreground">
              {formatDuration(memberTotal(m, now))}
            </span>
          </article>
        ))}
      </div>
    </section>
  )
}

function memberTotal(member: DashboardMember, now: number) {
  return member.sessions.reduce((sum, s) => {
    const span = (s.endedAt ?? now) - s.startedAt
    return sum + Math.max(0, span)
  }, 0)
}

// --- floating switcher ---

function PrototypeSwitcher({
  current,
  onSwitch,
}: {
  current: string
  onSwitch: (v: string) => void
}) {
  const cycle = (dir: number) => {
    const index = VARIANTS.indexOf(current as (typeof VARIANTS)[number])
    onSwitch(VARIANTS[(index + dir + VARIANTS.length) % VARIANTS.length])
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      if (e.key === 'ArrowLeft') cycle(-1)
      if (e.key === 'ArrowRight') cycle(1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, onSwitch])

  if (process.env.NODE_ENV === 'production') return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-background/90 px-3 py-1.5 shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={() => cycle(-1)}
        className="cursor-pointer rounded-full p-1 text-muted-foreground hover:text-foreground"
        aria-label="Previous variant"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <span className="text-xs font-medium tabular-nums text-foreground">
        {current}
        {current === 'A' && ' · Strip'}
        {current === 'B' && ' · Hero'}
        {current === 'C' && ' · Inline'}
      </span>
      <button
        type="button"
        onClick={() => cycle(1)}
        className="cursor-pointer rounded-full p-1 text-muted-foreground hover:text-foreground"
        aria-label="Next variant"
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}
