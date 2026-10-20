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
import { MetricToggle } from '~/components/dashboard/metric-toggle'
import { NotificationBell } from '~/components/notification-bell'
import { useMounted } from '~/hooks/use-mounted'
import { useQuoteOfTheDay } from '~/hooks/use-quote-of-the-day'
import { useScrollVisibility } from '~/hooks/use-scroll-visibility'
import { useDateStore } from '~/state/date.store'
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
    links: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
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
  const selectedDate = useDateStore((state) => state.selectedDate)
  const selectToday = useDateStore((state) => state.selectToday)
  // The date is derived from the client clock, so gate it behind mount to keep
  // the server HTML and the first client paint identical.
  const mounted = useMounted()
  // Assume today until the client clock exists, for the same reason.
  const isToday = !mounted || isSameDay(selectedDate, new Date())
  // The header's quote of the day, from Convex (null until signed in / fetched).
  const quote = useQuoteOfTheDay()
  useScrollVisibility()
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-[1560px] shrink-0 items-center justify-between gap-3 px-3.5 text-sm lg:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <Link
                to="/"
                className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold tracking-tight"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/30">
                  <span className="h-2 w-2 rounded-[3px] bg-primary" />
                </span>
                studytrack
              </Link>
              <div className="flex items-baseline">
                <span className="text-label tracking-[0.18em]">
                  {mounted ? (
                    new Intl.DateTimeFormat(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    }).format(selectedDate)
                  ) : (
                    <span className="skeleton inline-block h-3 w-28 rounded" />
                  )}
                </span>
                {isToday ? (
                  <h1 className="ml-3 font-semibold max-lg:ml-2.5">Today</h1>
                ) : (
                  <button
                    type="button"
                    title="Back to today"
                    aria-label="Back to today"
                    onClick={() => selectToday(new Date())}
                    className="ml-3 cursor-pointer font-semibold text-foreground/50 transition-colors hover:text-foreground max-lg:ml-2.5"
                  >
                    Today
                  </button>
                )}
              </div>
              {quote && (
                <p className="hidden min-w-0 truncate border-l border-border pl-4 font-serif text-sm italic text-muted-foreground lg:block">
                  &ldquo;{quote.text}&rdquo;{' '}
                  <span className="not-italic">&mdash; {quote.author}</span>
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              {/* the metric switch is global and always visible — it fronts the
                  numbers where the dashboard is browsable, signed in or not */}
              <MetricToggle />
              <NotificationBell />
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

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
