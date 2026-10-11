import type { DashboardMember } from '@studytrack/backend/convex/sessions/types'
import { formatDuration, memberTotalMs } from '@studytrack/backend/convex/sessions/util'
import { cn } from '~/lib/utils'
import { MemberTimeline } from './member-timeline'

export function MemberCard({
  member,
  dayStart,
  now,
}: {
  member: DashboardMember
  dayStart: number
  now: number
}) {
  const name = member.name ?? member.discordId
  const total = formatDuration(memberTotalMs(member, now))
  const sessions = member.sessions.length

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-muted-foreground/30">
      <div className="flex items-center gap-3">
        <MemberAvatar name={name} image={member.image} online={member.online} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{name}</span>
            {member.online && <StudyingPill />}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {sessions} {sessions === 1 ? 'session' : 'sessions'} today
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-lg font-semibold tabular-nums text-foreground">
            {total}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">today</div>
        </div>
      </div>
      <div className="mt-4">
        <MemberTimeline sessions={member.sessions} dayStart={dayStart} now={now} />
      </div>
    </article>
  )
}

function StudyingPill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary ring-1 ring-inset ring-primary/25">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70 motion-reduce:hidden" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
      Studying
    </span>
  )
}

function MemberAvatar({
  name,
  image,
  online,
}: {
  name: string
  image: string | null
  online: boolean
}) {
  const shape = 'h-10 w-10 shrink-0 rounded-full'
  const ring = online ? 'ring-2 ring-primary/40' : 'ring-1 ring-border'

  if (image) {
    return <img src={image} alt="" className={cn(shape, ring, 'object-cover')} />
  }
  return (
    <span
      className={cn(
        shape,
        ring,
        'flex items-center justify-center bg-secondary text-xs font-medium uppercase text-muted-foreground'
      )}
    >
      {initials(name)}
    </span>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`
  return name.slice(0, 2)
}
