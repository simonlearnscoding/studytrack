import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from '@tanstack/react-router'
import { ClerkProvider, SignInButton, UserButton, useAuth } from '@clerk/tanstack-react-start'
import { shadcn } from '@clerk/ui/themes'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import * as React from 'react'
import type { ConvexReactClient } from 'convex/react'
import appCss from '~/styles/app.css?url'

export const Route = createRootRouteWithContext<{ convexClient: ConvexReactClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'studytrack' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
})

function RootComponent() {
  const { convexClient } = useRouteContext({ from: Route.id })
  return (
    <ClerkProvider appearance={{ theme: shadcn }}>
      <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
        <RootDocument>
          <Outlet />
        </RootDocument>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth()
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header className="flex items-center gap-4 border-b border-neutral-800 px-6 py-3">
          <Link to="/" className="font-semibold">
            studytrack
          </Link>
          <div className="ml-auto">
            {isSignedIn ? <UserButton /> : <SignInButton mode="modal" />}
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
        <Scripts />
      </body>
    </html>
  )
}
