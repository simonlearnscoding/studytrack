import type { DashboardMember } from '@studytrack/backend/convex/sessions/types'
import { formatDuration, memberTotalMs } from '@studytrack/backend/convex/sessions/util'
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

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex items-center gap-3">
        <MemberAvatar name={name} image={member.image} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{name}</span>
            {member.online && (
              <span
                className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400"
                aria-label="Online"
              />
            )}
          </div>
          <span className="text-xs text-neutral-500">
            {member.sessions.length} {member.sessions.length === 1 ? 'session' : 'sessions'} today
          </span>
        </div>
        <span className="font-mono text-sm tabular-nums text-neutral-200">{total}</span>
      </div>
      <div className="mt-3">
        <MemberTimeline sessions={member.sessions} dayStart={dayStart} now={now} />
      </div>
    </div>
  )
}

function MemberAvatar({ name, image }: { name: string; image: string | null }) {
  if (image) {
    return <img src={image} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-xs font-medium uppercase text-neutral-200">
      {initials(name)}
    </span>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`
  return name.slice(0, 2)
}
