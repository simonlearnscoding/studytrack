import { SignInButton, SignUpButton, useAuth } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import { TodayLayout } from '~/components/dashboard/focus-view/focus-view'
import { Button } from '~/components/ui/button'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { isSignedIn } = useAuth()
  return isSignedIn ? <TodayLayout /> : <Welcome />
}

function Welcome() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-16 sm:px-6">
      <h1 className="text-display">Track study time in your Discord</h1>
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
