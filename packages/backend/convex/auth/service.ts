import type { MutationCtx, QueryCtx } from '../_generated/server'

// The dev deployment runs signed-out (DEV_AUTH_BYPASS in packages/backend/.env.local)
// so /beta can be worked on without Clerk. Prod never sets it, so the identity
// check always runs there. This file is the only place that reads the flag.
export function isDevBypass(): boolean {
  return process.env.DEV_AUTH_BYPASS === '1'
}

// Whether a read may return member data. Callers choose their own empty answer
// (`[]`, `null`, empty boards) because the UI needs a normal empty state, not a
// throw. Writes that must reject use their own `Not authenticated` guard.
export async function hasViewer(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  return isDevBypass() || (await ctx.auth.getUserIdentity()) !== null
}
