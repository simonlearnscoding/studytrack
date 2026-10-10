import { SignInButton, SignUpButton, useAuth } from '@clerk/tanstack-react-start'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { isSignedIn } = useAuth()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Track study time in your Discord</h1>
      <p className="max-w-prose text-neutral-400">
        When someone joins a study voice channel, the bot records the session and it shows up here,
        live.
      </p>
      {isSignedIn ? (
        <Link
          to="/dashboard"
          className="inline-flex h-9 items-center rounded-md bg-neutral-100 px-4 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
        >
          Open dashboard
        </Link>
      ) : (
        <div className="flex gap-3">
          <SignInButton mode="modal">
            <Button>Sign in with Discord</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button variant="outline">Sign up</Button>
          </SignUpButton>
        </div>
      )}
    </div>
  )
}
