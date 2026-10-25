/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

describe('preferences.mine', () => {
  it('returns the defaults when signed out', async () => {
    const t = convexTest(schema, modules)

    expect(await t.query(api.preferences.mine, {})).toEqual({
      metric: 'focus',
      isDoneFolded: false,
      leaderboardPeriod: 'week',
    })
  })

  it('returns the defaults before the member has ever chosen', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('users', { clerkUserId: 'clerk-1', createdAt: Date.now() })
    })

    expect(await t.withIdentity({ subject: 'clerk-1' }).query(api.preferences.mine, {})).toEqual({
      metric: 'focus',
      isDoneFolded: false,
      leaderboardPeriod: 'week',
    })
  })

  it('returns the stored metric', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('users', { clerkUserId: 'clerk-1', createdAt: Date.now() })
    })

    await t
      .withIdentity({ subject: 'clerk-1' })
      .mutation(api.preferences.setMetric, { metric: 'total' })

    expect(await t.withIdentity({ subject: 'clerk-1' }).query(api.preferences.mine, {})).toEqual({
      metric: 'total',
      isDoneFolded: false,
      leaderboardPeriod: 'week',
    })
  })

  it('reads expanded when the stored row predates the fold column', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', {
        clerkUserId: 'clerk-1',
        createdAt: Date.now(),
      })
      await ctx.db.insert('preference', { userId, metric: 'total' })
    })

    expect(await t.withIdentity({ subject: 'clerk-1' }).query(api.preferences.mine, {})).toEqual({
      metric: 'total',
      isDoneFolded: false,
      leaderboardPeriod: 'week',
    })
  })
})

describe('preferences.setMetric', () => {
  it('creates one row on the first write and patches it after that', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('users', { clerkUserId: 'clerk-1', createdAt: Date.now() })
    })

    const asMember = t.withIdentity({ subject: 'clerk-1' })
    await asMember.mutation(api.preferences.setMetric, { metric: 'total' })
    await asMember.mutation(api.preferences.setMetric, { metric: 'focus' })

    const rows = await t.run(async (ctx) => await ctx.db.query('preference').collect())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ metric: 'focus' })
  })

  it('rejects a write when signed out', async () => {
    const t = convexTest(schema, modules)

    await expect(t.mutation(api.preferences.setMetric, { metric: 'total' })).rejects.toThrow(
      'Not authenticated'
    )
  })
})

describe('preferences.setDoneFolded', () => {
  it('persists folded and unfolded', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('users', { clerkUserId: 'clerk-1', createdAt: Date.now() })
    })

    const asMember = t.withIdentity({ subject: 'clerk-1' })
    await asMember.mutation(api.preferences.setDoneFolded, { folded: true })

    expect(await asMember.query(api.preferences.mine, {})).toEqual({
      metric: 'focus',
      isDoneFolded: true,
      leaderboardPeriod: 'week',
    })

    await asMember.mutation(api.preferences.setDoneFolded, { folded: false })

    expect(await asMember.query(api.preferences.mine, {})).toEqual({
      metric: 'focus',
      isDoneFolded: false,
      leaderboardPeriod: 'week',
    })
  })

  it('leaves the metric alone, and the metric write leaves the fold alone', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('users', { clerkUserId: 'clerk-1', createdAt: Date.now() })
    })

    const asMember = t.withIdentity({ subject: 'clerk-1' })
    await asMember.mutation(api.preferences.setMetric, { metric: 'total' })
    await asMember.mutation(api.preferences.setDoneFolded, { folded: true })

    expect(await asMember.query(api.preferences.mine, {})).toEqual({
      metric: 'total',
      isDoneFolded: true,
      leaderboardPeriod: 'week',
    })

    await asMember.mutation(api.preferences.setMetric, { metric: 'focus' })

    expect(await asMember.query(api.preferences.mine, {})).toEqual({
      metric: 'focus',
      isDoneFolded: true,
      leaderboardPeriod: 'week',
    })
  })

  it('keeps one row after both kinds of write', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('users', { clerkUserId: 'clerk-1', createdAt: Date.now() })
    })

    const asMember = t.withIdentity({ subject: 'clerk-1' })
    await asMember.mutation(api.preferences.setDoneFolded, { folded: true })
    await asMember.mutation(api.preferences.setMetric, { metric: 'total' })

    const rows = await t.run(async (ctx) => await ctx.db.query('preference').collect())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ metric: 'total', isDoneFolded: true })
  })

  it('rejects a write when signed out', async () => {
    const t = convexTest(schema, modules)

    await expect(t.mutation(api.preferences.setDoneFolded, { folded: true })).rejects.toThrow(
      'Not authenticated'
    )
  })
})

describe('preferences.setLeaderboardPeriod', () => {
  it('persists the chosen Period', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('users', { clerkUserId: 'clerk-1', createdAt: Date.now() })
    })

    const asMember = t.withIdentity({ subject: 'clerk-1' })
    await asMember.mutation(api.preferences.setLeaderboardPeriod, { period: 'day' })

    expect(await asMember.query(api.preferences.mine, {})).toEqual({
      metric: 'focus',
      isDoneFolded: false,
      leaderboardPeriod: 'day',
    })
  })

  it('leaves the metric and the fold state alone', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('users', { clerkUserId: 'clerk-1', createdAt: Date.now() })
    })

    const asMember = t.withIdentity({ subject: 'clerk-1' })
    await asMember.mutation(api.preferences.setMetric, { metric: 'total' })
    await asMember.mutation(api.preferences.setDoneFolded, { folded: true })
    await asMember.mutation(api.preferences.setLeaderboardPeriod, { period: 'month' })

    expect(await asMember.query(api.preferences.mine, {})).toEqual({
      metric: 'total',
      isDoneFolded: true,
      leaderboardPeriod: 'month',
    })
  })

  it('rejects a write when signed out', async () => {
    const t = convexTest(schema, modules)

    await expect(
      t.mutation(api.preferences.setLeaderboardPeriod, { period: 'day' })
    ).rejects.toThrow('Not authenticated')
  })
})
