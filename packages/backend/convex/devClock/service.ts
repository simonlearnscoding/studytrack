import type { MutationCtx, QueryCtx } from '../_generated/server'
import { isDevBypass } from '../auth/service'
import type { DevClock } from './types'
import {
  isDevClockDeployment,
  isValidClockOffset,
  resolveDevClockOffset,
  withDevClockOffset,
} from './util'

// The deployment-wide singleton. A development deployment has at most one clock,
// so every client and every interactive write agree on the same fake now.
const SINGLETON = 'global'

export function isDevClockEnabled(): boolean {
  return isDevClockDeployment(isDevBypass())
}

// What the dashboard needs to render and drive the dev clock. Production reads an
// always-off clock even if a row somehow exists.
export async function getClock(ctx: QueryCtx): Promise<DevClock> {
  return { enabled: isDevClockEnabled(), offsetMs: await currentOffset(ctx) }
}

// Move the deployment-wide dev clock. Refused outside a dev deployment, so a
// client can never turn time travel on in production.
export async function setClockOffset(ctx: MutationCtx, offsetMs: number): Promise<void> {
  if (!isDevClockEnabled()) throw new Error('The dev clock is disabled.')
  if (!isValidClockOffset(offsetMs)) throw new Error('The dev clock offset must be a whole number.')

  const stored = await find(ctx)
  if (stored) await ctx.db.patch(stored._id, { offsetMs })
  else await ctx.db.insert('devClock', { singleton: SINGLETON, offsetMs })
}

// The server's clock for interactive writes. Crons and stored Daily totals call
// `Date.now()` directly and deliberately stay on real time.
export async function getClockNow(ctx: QueryCtx | MutationCtx): Promise<number> {
  return withDevClockOffset(Date.now(), await currentOffset(ctx))
}

async function currentOffset(ctx: QueryCtx | MutationCtx): Promise<number> {
  if (!isDevClockEnabled()) return 0
  const stored = await find(ctx)
  return resolveDevClockOffset(true, stored?.offsetMs ?? 0)
}

async function find(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query('devClock')
    .withIndex('by_singleton', (q) => q.eq('singleton', SINGLETON))
    .unique()
}
