import { api } from '@studytrack/backend/convex/_generated/api'
import { formatDuration } from '@studytrack/backend/convex/sessions/util'
import { useUser } from '@clerk/tanstack-react-start'
import { useMutation, useQuery } from 'convex/react'
import { LoaderCircle, Pause, Play, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { useMounted } from '~/hooks/use-mounted'
import { useNow } from '~/hooks/use-now'
import { MotivationCard } from './motivation-card'
import { StatsCard } from './stats-card'
import { TaskList } from './tasks/task-list'

// The personal rail: the manual time tracker (start/stop; the live elapsed figure
// ticks against the client clock, never the server's), the private task list,
// and the presentational stats and motivation cards.
export function SelfPanel() {
  const { user } = useUser()
  const mounted = useMounted()
  const status = useQuery(api.tracking.getMine)
  const now = useNow(1000)
  const start = useMutation(api.tracking.start)
  const stop = useMutation(api.tracking.stop)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<unknown>) => {
    setPending(true)
    setError(null)
    try {
      await action()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.')
    } finally {
      setPending(false)
    }
  }

  // The name/avatar arrive with the Clerk user after mount; "You" is the
  // hydration-safe default.
  const name = mounted ? (user?.fullName ?? user?.username ?? undefined) : undefined

  // `lg:h-full` lets the task list grow into the height the other cards leave
  // over, pinning stats and motivation to the bottom of the rail.
  return (
    <div className="flex flex-col gap-6 lg:h-full">
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          You
        </h2>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <SelfAvatar name={name} image={mounted ? (user?.imageUrl ?? undefined) : undefined} />
            <p className="truncate text-sm font-medium text-foreground">{name ?? 'You'}</p>
          </div>
          <div className="mt-4">
            {status === undefined ? (
              <TrackerSkeleton />
            ) : status === null ? (
              <p className="text-sm text-muted-foreground">Setting up your tracker…</p>
            ) : status.mode === 'manual' ? (
              <ManualActive
                elapsedMs={now - (status.startedAt ?? now)}
                pending={pending}
                onStop={() => run(stop)}
              />
            ) : status.mode ? (
              <DiscordActive />
            ) : (
              <ManualIdle pending={pending} onStart={() => run(start)} />
            )}
            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
          </div>
        </div>
      </div>
      <TaskList />
      <StatsCard />
      <MotivationCard />
    </div>
  )
}

function SelfAvatar({ name, image }: { name?: string; image?: string }) {
  if (image) {
    return (
      <img
        src={image}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
      />
    )
  }
  if (name) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium uppercase text-muted-foreground ring-1 ring-border">
        {name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join('')}
      </span>
    )
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground ring-1 ring-border">
      <UserRound className="h-4 w-4" aria-hidden />
    </span>
  )
}

function ManualIdle({ pending, onStart }: { pending: boolean; onStart: () => void }) {
  return (
    <>
      <p className="text-sm text-muted-foreground">Studying away from Discord?</p>
      <Button className="mt-3 w-full" onClick={onStart} disabled={pending}>
        {pending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Play className="h-4 w-4 fill-current" aria-hidden />
        )}
        Start tracking
      </Button>
    </>
  )
}

function ManualActive({
  elapsedMs,
  pending,
  onStop,
}: {
  elapsedMs: number
  pending: boolean
  onStop: () => void
}) {
  return (
    <>
      <div className="flex items-center gap-2 text-mode-manual">
        <Pulse />
        <span className="text-sm font-medium">Tracking manually</span>
      </div>
      <div className="mt-3 font-mono text-2xl font-semibold tabular-nums text-foreground">
        {formatDuration(elapsedMs)}
      </div>
      <Button variant="outline" className="mt-3 w-full" onClick={onStop} disabled={pending}>
        {pending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Pause className="h-4 w-4 fill-current" aria-hidden />
        )}
        Stop tracking
      </Button>
    </>
  )
}

function DiscordActive() {
  return (
    <>
      <div className="flex items-center gap-2 text-primary">
        <Pulse />
        <span className="text-sm font-medium">Studying in Discord</span>
      </div>
      <Button variant="outline" className="mt-3 w-full" disabled>
        <Play className="h-4 w-4 fill-current" aria-hidden />
        Tracking on Discord
      </Button>
    </>
  )
}

function Pulse() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60 motion-reduce:hidden" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
    </span>
  )
}

function TrackerSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-32 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
      <div className="h-9 w-full animate-pulse rounded-lg bg-secondary motion-reduce:animate-none" />
    </div>
  )
}
