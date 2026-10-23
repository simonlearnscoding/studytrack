/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { internal } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

describe('clearTables.clearAll', () => {
  it('deletes every row in every table', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('users', { discordId: 'd-1', createdAt: Date.now() })
      const sessionId = await ctx.db.insert('session', {
        discordId: 'd-1',
        guildId: 'g-1',
        status: 'active',
        startedAt: Date.now(),
      })
      await ctx.db.insert('sessionPartial', {
        sessionId,
        discordId: 'd-1',
        guildId: 'g-1',
        channelId: 'c-1',
        mode: 'voice',
        status: 'active',
        startedAt: Date.now(),
      })
    })

    const result = await t.mutation(internal.clearTables.clearAll, {})
    expect(result.deleted).toBeGreaterThan(0)

    const left = await t.run(async (ctx) => ({
      users: await ctx.db.query('users').collect(),
      sessionPartials: await ctx.db.query('sessionPartial').collect(),
    }))
    expect(left.users).toHaveLength(0)
    expect(left.sessionPartials).toHaveLength(0)
  })
})
