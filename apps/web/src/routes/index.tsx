import { SignInButton, SignUpButton, useAuth } from '@clerk/tanstack-react-start'
import { api } from '@studytrack/backend/convex/_generated/api'
import { sortMembers } from '@studytrack/backend/convex/sessions/util'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { DashboardShell } from '~/components/dashboard/dashboard-shell'
import { RoomPanel, RoomPanelSkeleton } from '~/components/dashboard/room-panel'
import { SelfPanel } from '~/components/dashboard/self-panel'
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
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Track study time in your Discord
      </h1>
      <p className="max-w-prose text-muted-foreground">Sign in to see who is studying right now.</p>
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

  if (!mounted || members === undefined) {
    return <DashboardShell room={<RoomPanelSkeleton />} self={<SelfPanel />} />
  }

  return (
    <DashboardShell
      room={<RoomPanel members={sortMembers(members, now)} dayStart={dayStart} now={now} />}
      self={<SelfPanel />}
    />
  )
}
