import { Lock } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Avatar } from './avatar'
import { label, type Presence } from './data'

export function PresenceRail({ people, className }: { people: Presence[]; className?: string }) {
  return (
    <aside className={cn('flex min-h-0 flex-col lg:order-none', className)}>
      <div className={`flex items-center gap-2 pb-2.5 pl-0.5 ${label}`}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" />
          <span className="bg-primary relative inline-flex h-1.5 w-1.5 rounded-full" />
        </span>
        In the room
        <span className="text-muted-foreground tracking-normal">· {people.length}</span>
      </div>

      {/* contract: live users in join order · horizontal chips on mobile · the rail scrolls, not this list */}
      <div
        className="flex flex-col gap-2 pr-0.5
                  max-lg:flex-row max-lg:overflow-x-auto max-lg:overflow-y-hidden"
      >
        {people.map((p) => (
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
  )
}
