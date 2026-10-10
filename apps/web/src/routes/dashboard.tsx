import { convexQuery } from '@convex-dev/react-query'
import { api } from '@studytrack/backend/convex/_generated/api'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  // Server-side gate: runs before render, on the server for the first load.
  beforeLoad: ({ context }) => {
    if (!context.userId) throw redirect({ to: '/' })
  },
  // Prefetch the live query during SSR so there is no loading flash.
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(convexQuery(api.sessions.listActive, {}))
  },
  component: Dashboard,
})

function Dashboard() {
  // Live: updates the moment the bot opens or closes a session.
  const { data: sessions } = useSuspenseQuery(convexQuery(api.sessions.listActive, {}))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        <h1 className="text-2xl font-bold">Studying now</h1>
      </div>

      {sessions.length === 0 ? (
        <p className="text-neutral-500">No open sessions. Join a study voice channel.</p>
      ) : (
        <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800">
          {sessions.map((session) => (
            <li key={session._id} className="flex items-center justify-between px-4 py-3">
              <span className="font-mono text-sm">{session.discordId}</span>
              <span className="text-sm text-neutral-400">
                since {new Date(session.startedAt).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
