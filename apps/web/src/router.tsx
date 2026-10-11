import { createRouter } from '@tanstack/react-router'
import { ConvexReactClient } from 'convex/react'
import { ErrorScreen } from './components/error-screen'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const CONVEX_URL = import.meta.env.VITE_CONVEX_URL
  if (!CONVEX_URL) throw new Error('Missing VITE_CONVEX_URL environment variable')

  const convexClient = new ConvexReactClient(CONVEX_URL, { unsavedChangesWarning: false })

  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultErrorComponent: ErrorScreen,
    defaultNotFoundComponent: () => <p className="text-neutral-500">Page not found.</p>,
    context: { convexClient },
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
