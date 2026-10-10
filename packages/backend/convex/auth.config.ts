import type { AuthConfig } from 'convex/server'

// Clerk is the identity provider. `CLERK_JWT_ISSUER_DOMAIN` is set per Convex
// deployment and points at your Clerk instance's issuer URL.
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: 'convex',
    },
  ],
} satisfies AuthConfig
