/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

describe('users.upsertFromClerk', () => {
  it('links a bot-created Discord row to the Clerk account', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('users', { discordId: 'discord-1', createdAt: Date.now() })
    })

    await t
      .withIdentity({ subject: 'clerk-1' })
      .mutation(api.users.upsertFromClerk, { discordId: 'discord-1', name: 'Ada' })

    const rows = await t.run(async (ctx) => await ctx.db.query('users').collect())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      clerkUserId: 'clerk-1',
      discordId: 'discord-1',
      name: 'Ada',
    })
  })

  it('keeps the Discord-provided name when the Clerk account links', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('users', {
        discordId: 'discord-3',
        name: 'spaghettiboy94',
        createdAt: Date.now(),
      })
    })

    await t.withIdentity({ subject: 'clerk-3' }).mutation(api.users.upsertFromClerk, {
      discordId: 'discord-3',
      name: 'Simon M',
    })

    const rows = await t.run(async (ctx) => await ctx.db.query('users').collect())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ clerkUserId: 'clerk-3', name: 'spaghettiboy94' })
  })

  it('creates a user when none exists yet', async () => {
    const t = convexTest(schema, modules)

    await t.withIdentity({ subject: 'clerk-2' }).mutation(api.users.upsertFromClerk, {
      name: 'Bob',
    })

    const rows = await t.run(async (ctx) => await ctx.db.query('users').collect())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ clerkUserId: 'clerk-2', name: 'Bob' })
  })
})

describe('users.me dev impersonation', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('returns the named seeded member signed-out when DEV_AUTH_BYPASS is on', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('users', {
        discordId: 'dev-1',
        clerkUserId: 'clerk-dev-1',
        name: 'Dev',
        createdAt: Date.now(),
      })
    })

    vi.stubEnv('DEV_AUTH_BYPASS', '1')
    vi.stubEnv('DEV_IMPERSONATE_DISCORD_ID', 'dev-1')
    expect(await t.query(api.users.me, {})).toMatchObject({
      discordId: 'dev-1',
      name: 'Dev',
    })
  })

  it('falls back to the Clerk id, then null', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('users', {
        clerkUserId: 'clerk-dev-2',
        name: 'Clerk',
        createdAt: Date.now(),
      })
    })

    vi.stubEnv('DEV_AUTH_BYPASS', '1')
    vi.stubEnv('DEV_IMPERSONATE_DISCORD_ID', '')
    vi.stubEnv('DEV_IMPERSONATE_CLERK_USER_ID', 'clerk-dev-2')
    expect(await t.query(api.users.me, {})).toMatchObject({ name: 'Clerk' })

    vi.stubEnv('DEV_IMPERSONATE_CLERK_USER_ID', '')
    expect(await t.query(api.users.me, {})).toBeNull()
  })

  it('stays null signed-out without DEV_AUTH_BYPASS', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('users', { discordId: 'dev-1', createdAt: Date.now() })
    })

    vi.stubEnv('DEV_IMPERSONATE_DISCORD_ID', 'dev-1')
    expect(await t.query(api.users.me, {})).toBeNull()
  })
})
