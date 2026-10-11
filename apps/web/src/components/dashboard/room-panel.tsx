import type { DashboardMember } from '@studytrack/backend/convex/sessions/types'
import { MemberCard } from './member-card'
import { ModeLegend } from './mode-legend'

// The social column: the present-tense room for today. Header, legend and the
// two member groups. The data is already sorted (online first, most study time
// first), so we only split it here.
export function RoomPanel({
  members,
  dayStart,
  now,
}: {
  members: DashboardMember[]
  dayStart: number
  now: number
}) {
  const online = members.filter((member) => member.online)
  const offline = members.filter((member) => !member.online)

  return (
    <div className="flex flex-col gap-8">
      <RoomHeader dayStart={dayStart} studying={online.length} total={members.length} />

      {members.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          No one has studied today yet. Join a study voice channel.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          <Section
            title="Studying now"
            members={online}
            dayStart={dayStart}
            now={now}
            empty="No one is studying right now."
          />
          {offline.length > 0 && (
            <Section title="Studied today" members={offline} dayStart={dayStart} now={now} />
          )}
        </div>
      )}
    </div>
  )
}

function RoomHeader({
  dayStart,
  studying,
  total,
}: {
  dayStart?: number
  studying?: number
  total?: number
}) {
  // Clean text over the shell's full-height backdrop; the photo emerges only
  // toward the rail, behind the quote.
  return (
    <header className="relative flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {dayStart === undefined ? (
          <span className="inline-block h-3 w-28 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
        ) : (
          new Intl.DateTimeFormat(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }).format(dayStart)
        )}
      </p>
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 motion-reduce:hidden" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Today</h1>
      </div>
      {total !== undefined && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">{studying}</span> studying now
          · <span className="font-medium text-foreground tabular-nums">{total}</span>{' '}
          {total === 1 ? 'person' : 'people'} today
        </p>
      )}
      <div className="pt-1">
        <ModeLegend />
      </div>
      <p className="absolute top-0 right-0 hidden text-sm italic text-muted-foreground sm:block">
        &ldquo;Small steps drive big results.&rdquo;
      </p>
    </header>
  )
}

function Section({
  title,
  members,
  dayStart,
  now,
  empty,
}: {
  title: string
  members: DashboardMember[]
  dayStart: number
  now: number
  empty?: string
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </h2>
        <span className="rounded-full bg-secondary px-2 text-[11px] leading-5 tabular-nums text-muted-foreground">
          {members.length}
        </span>
      </div>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground/70">{empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {members.map((member) => (
            <MemberCard key={member.discordId} member={member} dayStart={dayStart} now={now} />
          ))}
        </div>
      )}
    </section>
  )
}

export function RoomPanelSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <RoomHeader />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[112px] animate-pulse rounded-2xl border border-border bg-card motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  )
}
