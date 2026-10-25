import { isDevBypass } from '../auth/service'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import type { UpsertFromClerkArgs } from './types'

// The signed-in user's row, or null.
export async function getMe(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (identity) {
    return await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
      .unique()
  }
  // The local deployment may name a seeded member to stand in for the caller, so
  // member-scoped reads (dailyTotals.listMine) can be exercised without a real
  // sign-in. Prod sets neither variable, so this branch never runs there.
  if (isDevBypass()) return await devImpersonated(ctx)
  return null
}

async function devImpersonated(ctx: QueryCtx) {
  const discordId = process.env.DEV_IMPERSONATE_DISCORD_ID
  if (discordId) {
    return await ctx.db
      .query('users')
      .withIndex('by_discordId', (q) => q.eq('discordId', discordId))
      .first()
  }
  const clerkUserId = process.env.DEV_IMPERSONATE_CLERK_USER_ID
  if (clerkUserId) {
    return await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', clerkUserId))
      .unique()
  }
  return null
}

// The bot only knows the Discord id (and username), so this creates the row on
// first sight and returns it. The Clerk sign-in later links it (see
// `upsertFromClerk`), without overwriting the Discord-provided name.
export async function ensureDiscordUser(
  ctx: MutationCtx,
  discordId: string,
  name?: string
): Promise<Id<'users'>> {
  const existing = await findByDiscordId(ctx, discordId)
  if (existing) {
    if (name && !existing.name) await ctx.db.patch(existing._id, { name })
    return existing._id
  }
  return await ctx.db.insert('users', { discordId, name, createdAt: Date.now() })
}

// Creates or updates the caller's row, linking a bot-created Discord row to the
// verified Clerk identity. `clerkUserId` always comes from the identity — never
// from the arguments — so it cannot be spoofed.
export async function upsertFromClerk(ctx: MutationCtx, args: UpsertFromClerkArgs) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error('Not authenticated')

  const byClerk = await ctx.db
    .query('users')
    .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
    .unique()

  const linked = byClerk ?? (args.discordId ? await findByDiscordId(ctx, args.discordId) : null)

  if (linked) {
    await ctx.db.patch(linked._id, {
      clerkUserId: identity.subject,
      discordId: args.discordId ?? linked.discordId,
      // Keep the Discord-provided name; only fill it in when missing.
      name: linked.name ?? args.name,
      image: args.image ?? linked.image,
    })
    return linked._id
  }

  return await ctx.db.insert('users', {
    clerkUserId: identity.subject,
    discordId: args.discordId,
    name: args.name,
    image: args.image,
    createdAt: Date.now(),
  })
}

async function findByDiscordId(ctx: MutationCtx, discordId: string) {
  return await ctx.db
    .query('users')
    .withIndex('by_discordId', (q) => q.eq('discordId', discordId))
    .first()
}
