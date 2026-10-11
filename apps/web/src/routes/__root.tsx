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
// Side-effect import (not `?url`): Start discovers the stylesheet from the
// client build and links it per route. With `?url` the SSR build hashes the CSS
// differently than the client build on Linux, so the SSR `<link>` 404s.
import '~/styles/app.css'

export const Route = createRootRouteWithContext<{ convexClient: ConvexReactClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'studytrack' },
    ],
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
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
          <div className="flex h-14 w-full items-center gap-4 px-4 sm:px-6 lg:px-8">
            <Link
              to="/"
              className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold tracking-tight"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/30">
                <span className="h-2 w-2 rounded-[3px] bg-primary" />
              </span>
              studytrack
            </Link>
            <div className="ml-auto">
              {isSignedIn ? <UserButton /> : <SignInButton mode="modal" />}
            </div>
          </div>
        </header>
        <main className="w-full">{children}</main>
        <Scripts />
      </body>
    </html>
  )
}
