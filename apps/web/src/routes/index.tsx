import { SignInButton, SignUpButton, useAuth } from '@clerk/tanstack-react-start'
import { api } from '@studytrack/backend/convex/_generated/api'
import type { DashboardMember } from '@studytrack/backend/convex/sessions/types'
import { sortMembers } from '@studytrack/backend/convex/sessions/util'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { MemberCard } from '~/components/dashboard/member-card'
import { Button } from '~/components/ui/button'
import { useDayStart } from '~/hooks/use-day-start'
import { useMounted } from '~/hooks/use-mounted'
import { useNow } from '~/hooks/use-now'
import { useSyncClerkUser } from '~/hooks/use-sync-clerk-user'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { isSignedIn } = useAuth()
  return isSignedIn ? <Dashboard /> : <Welcome />
}

function Welcome() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Track study time in your Discord</h1>
      <p className="max-w-prose text-neutral-400">Sign in to see who is studying right now.</p>
      <div className="flex gap-3">
        <SignInButton mode="modal">
          <Button>Sign in with Discord</Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button variant="outline">Sign up</Button>
        </SignUpButton>
      </div>
    </div>
  )
}

function Dashboard() {
  useSyncClerkUser()
  const dayStart = useDayStart()
  const now = useNow(1000)
  const members = useQuery(api.sessions.getTodaysActivitiesForDashboard, { dayStart })

  // The server render and the first client paint happen before Convex has data
  // and before the client clock exists; wait for mount to avoid a hydration
  // mismatch on the live, time-derived numbers.
  const mounted = useMounted()

  if (!mounted || members === undefined) return <DashboardSkeleton />

  const sorted = sortMembers(members, now)
  const online = sorted.filter((member) => member.online)
  const offline = sorted.filter((member) => !member.online)

  return (
    <div className="space-y-8">
      <Header />
      {sorted.length === 0 ? (
        <p className="text-neutral-500">
          No one has studied today yet. Join a study voice channel.
        </p>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}

function Header() {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
      <h1 className="text-2xl font-bold">Today</h1>
    </div>
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
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{title}</h2>
      {members.length === 0 ? (
        <p className="text-sm text-neutral-600">{empty}</p>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <MemberCard key={member.discordId} member={member} dayStart={dayStart} now={now} />
          ))}
        </div>
      )}
    </section>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Header />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[92px] animate-pulse rounded-lg border border-neutral-800 bg-neutral-900/40"
          />
        ))}
      </div>
    </div>
  )
}
