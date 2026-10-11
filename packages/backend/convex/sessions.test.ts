/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

const M = 60 * 1000
const H = 60 * 60 * 1000

// 2026-06-15 12:00 in Europe/Zurich (UTC+2 in summer), mid-day so "today" is
// unambiguous. Local midnight is therefore 2026-06-14 22:00 UTC.
const DAY_START = Date.UTC(2026, 5, 14, 22, 0, 0)
const NOW = Date.UTC(2026, 5, 15, 10, 0, 0)

describe('sessions.getTodaysActivitiesForDashboard', () => {
  it('returns nothing when unauthenticated', async () => {
    const t = convexTest(schema, modules)
    const res = await t.query(api.sessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })
    expect(res).toEqual([])
  })

  it('builds one card per member, raw timestamps and profile included', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', {
        discordId: 'discord-1',
        name: 'Ada',
        image: 'https://img/ada.png',
        createdAt: NOW,
      })
      const sessionId = await ctx.db.insert('session', {
        discordId: 'discord-1',
        userId,
        guildId: 'guild-1',
        status: 'active',
        startedAt: NOW - 30 * M,
      })
      await ctx.db.insert('sessionPartial', {
        sessionId,
        discordId: 'discord-1',
        userId,
        guildId: 'guild-1',
        channelId: 'chan-a',
        mode: 'camera',
        status: 'active',
        startedAt: NOW - 30 * M,
      })
    })

    const res = await t
      .withIdentity({ subject: 'clerk-1' })
      .query(api.sessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    expect(res).toHaveLength(1)
    expect(res[0]).toMatchObject({
      discordId: 'discord-1',
      name: 'Ada',
      image: 'https://img/ada.png',
      online: true,
    })
    expect(res[0].sessions).toHaveLength(1)
    expect(res[0].sessions[0]).toMatchObject({ status: 'active', endedAt: null })
    expect(res[0].sessions[0].partials[0]).toEqual({
      id: expect.anything(),
      channelId: 'chan-a',
      mode: 'camera',
      startedAt: NOW - 30 * M,
      endedAt: null,
    })
  })

  it('keeps break partials but leaves them out of nothing (raw payload)', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const sessionId = await ctx.db.insert('session', {
        discordId: 'discord-1',
        guildId: 'guild-1',
        status: 'ended',
        startedAt: NOW - 2 * H,
        endedAt: NOW - 30 * M,
      })
      await ctx.db.insert('sessionPartial', {
        sessionId,
        discordId: 'discord-1',
        guildId: 'guild-1',
        channelId: 'chan-a',
        mode: 'voice',
        status: 'ended',
        startedAt: NOW - 2 * H,
        endedAt: NOW - 1 * H,
        durationMs: 1 * H,
      })
      await ctx.db.insert('sessionPartial', {
        sessionId,
        discordId: 'discord-1',
        guildId: 'guild-1',
        mode: 'break',
        status: 'ended',
        startedAt: NOW - 1 * H,
        endedAt: NOW - 50 * M,
        durationMs: 10 * M,
      })
      await ctx.db.insert('sessionPartial', {
        sessionId,
        discordId: 'discord-1',
        guildId: 'guild-1',
        channelId: 'chan-b',
        mode: 'cameraAndScreenShare',
        status: 'ended',
        startedAt: NOW - 50 * M,
        endedAt: NOW - 30 * M,
        durationMs: 20 * M,
      })
    })

    const res = await t
      .withIdentity({ subject: 'clerk-1' })
      .query(api.sessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    expect(res).toHaveLength(1)
    expect(res[0].online).toBe(false)
    expect(res[0].sessions[0].partials).toHaveLength(3)
    expect(res[0].sessions[0].partials.map((p) => p.mode)).toContain('break')
    // Newest partial first.
    expect(res[0].sessions[0].partials[0].mode).toBe('cameraAndScreenShare')
  })

  it('hides a session that started and ended before today', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const sessionId = await ctx.db.insert('session', {
        discordId: 'discord-1',
        guildId: 'guild-1',
        status: 'ended',
        startedAt: DAY_START - 3 * H,
        endedAt: DAY_START - 2 * H,
      })
      await ctx.db.insert('sessionPartial', {
        sessionId,
        discordId: 'discord-1',
        guildId: 'guild-1',
        channelId: 'chan-a',
        mode: 'voice',
        status: 'ended',
        startedAt: DAY_START - 3 * H,
        endedAt: DAY_START - 2 * H,
        durationMs: 1 * H,
      })
    })

    const res = await t
      .withIdentity({ subject: 'clerk-1' })
      .query(api.sessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })
    expect(res).toEqual([])
  })

  it('keeps an active session that straddled midnight', async () => {
    const t = convexTest(schema, modules)
    const startedAt = DAY_START - 3 * H
    await t.run(async (ctx) => {
      const sessionId = await ctx.db.insert('session', {
        discordId: 'discord-1',
        guildId: 'guild-1',
        status: 'active',
        startedAt,
      })
      await ctx.db.insert('sessionPartial', {
        sessionId,
        discordId: 'discord-1',
        guildId: 'guild-1',
        channelId: 'chan-a',
        mode: 'screenShare',
        status: 'active',
        startedAt,
      })
    })

    const res = await t
      .withIdentity({ subject: 'clerk-1' })
      .query(api.sessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    expect(res).toHaveLength(1)
    expect(res[0].online).toBe(true)
    expect(res[0].sessions[0].partials[0].startedAt).toBe(startedAt)
  })

  it('groups several sessions into one member card', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const first = await ctx.db.insert('session', {
        discordId: 'discord-1',
        guildId: 'guild-1',
        status: 'ended',
        startedAt: NOW - 4 * H,
        endedAt: NOW - 3 * H,
      })
      await ctx.db.insert('sessionPartial', {
        sessionId: first,
        discordId: 'discord-1',
        guildId: 'guild-1',
        channelId: 'chan-a',
        mode: 'voice',
        status: 'ended',
        startedAt: NOW - 4 * H,
        endedAt: NOW - 3 * H,
        durationMs: 1 * H,
      })
      const second = await ctx.db.insert('session', {
        discordId: 'discord-1',
        guildId: 'guild-1',
        status: 'active',
        startedAt: NOW - 20 * M,
      })
      await ctx.db.insert('sessionPartial', {
        sessionId: second,
        discordId: 'discord-1',
        guildId: 'guild-1',
        channelId: 'chan-b',
        mode: 'camera',
        status: 'active',
        startedAt: NOW - 20 * M,
      })
    })

    const res = await t
      .withIdentity({ subject: 'clerk-1' })
      .query(api.sessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    expect(res).toHaveLength(1)
    expect(res[0].sessions).toHaveLength(2)
    expect(res[0].online).toBe(true)
    // Sessions newest first.
    expect(res[0].sessions[0].status).toBe('active')
  })
})
