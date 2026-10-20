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

  it('binds each completed task to the session containing its completion instant', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', {
        discordId: 'discord-1',
        name: 'Ada',
        createdAt: NOW,
      })
      const sessionId = await ctx.db.insert('session', {
        discordId: 'discord-1',
        userId,
        guildId: 'guild-1',
        status: 'ended',
        startedAt: NOW - 2 * H,
        endedAt: NOW - 1 * H,
      })
      await ctx.db.insert('sessionPartial', {
        sessionId,
        discordId: 'discord-1',
        userId,
        guildId: 'guild-1',
        channelId: 'chan-a',
        mode: 'voice',
        status: 'ended',
        startedAt: NOW - 2 * H,
        endedAt: NOW - 1 * H,
        durationMs: 1 * H,
      })
      // Completed inside the session — bound.
      await ctx.db.insert('task', {
        userId,
        title: 'Read a chapter',
        done: true,
        completedAt: NOW - 90 * M,
        plannedAt: DAY_START,
      })
      // Completed before it started — no session owns it.
      await ctx.db.insert('task', {
        userId,
        title: 'Before the session',
        done: true,
        completedAt: NOW - 3 * H,
        plannedAt: DAY_START,
      })
      // Open — never bound.
      await ctx.db.insert('task', {
        userId,
        title: 'Still open',
        done: false,
        plannedAt: DAY_START,
      })
    })

    const res = await t
      .withIdentity({ subject: 'clerk-1' })
      .query(api.sessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    const tasks = res[0].sessions[0].tasks
    expect(tasks.map((task) => task.title)).toEqual(['Read a chapter'])
    expect(tasks[0].completedAt).toBe(NOW - 90 * M)
  })

  it('binds tasks to a still-running session by its open end', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { discordId: 'discord-1', createdAt: NOW })
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
      await ctx.db.insert('task', {
        userId,
        title: 'Finished mid-session',
        done: true,
        completedAt: NOW - 5 * M,
        plannedAt: DAY_START,
      })
    })

    const res = await t
      .withIdentity({ subject: 'clerk-1' })
      .query(api.sessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    expect(res[0].sessions[0].tasks.map((task) => task.title)).toEqual(['Finished mid-session'])
  })

  it('keeps each member tasks with their own card', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const ada = await ctx.db.insert('users', { discordId: 'ada', name: 'Ada', createdAt: NOW })
      const bob = await ctx.db.insert('users', { discordId: 'bob', name: 'Bob', createdAt: NOW })

      for (const { userId, discordId } of [
        { userId: ada, discordId: 'ada' },
        { userId: bob, discordId: 'bob' },
      ]) {
        const sessionId = await ctx.db.insert('session', {
          discordId,
          userId,
          guildId: 'guild-1',
          status: 'ended',
          startedAt: NOW - 2 * H,
          endedAt: NOW - 1 * H,
        })
        await ctx.db.insert('sessionPartial', {
          sessionId,
          discordId,
          userId,
          guildId: 'guild-1',
          channelId: 'chan-a',
          mode: 'voice',
          status: 'ended',
          startedAt: NOW - 2 * H,
          endedAt: NOW - 1 * H,
          durationMs: 1 * H,
        })
      }

      await ctx.db.insert('task', {
        userId: ada,
        title: 'Ada private task',
        done: true,
        completedAt: NOW - 90 * M,
        plannedAt: DAY_START,
      })
    })

    const res = await t
      .withIdentity({ subject: 'clerk-1' })
      .query(api.sessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    const ada = res.find((member) => member.discordId === 'ada')
    const bob = res.find((member) => member.discordId === 'bob')
    expect(ada?.sessions[0].tasks.map((task) => task.title)).toEqual(['Ada private task'])
    expect(bob?.sessions[0].tasks).toEqual([])
  })

  it('shows a task planned into the session without a completion', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { discordId: 'discord-1', createdAt: NOW })
      const sessionId = await ctx.db.insert('session', {
        discordId: 'discord-1',
        userId,
        status: 'active',
        startedAt: NOW - 30 * M,
      })
      await ctx.db.insert('sessionPartial', {
        sessionId,
        discordId: 'discord-1',
        userId,
        channelId: 'chan-a',
        mode: 'voice',
        status: 'active',
        startedAt: NOW - 30 * M,
      })
      await ctx.db.insert('task', {
        userId,
        title: 'Planned for this sitting',
        done: false,
        plannedAt: DAY_START,
        plannedSessionId: sessionId,
      })
    })

    const res = await t
      .withIdentity({ subject: 'clerk-1' })
      .query(api.sessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    expect(res[0].sessions[0].tasks).toEqual([
      {
        id: expect.anything(),
        title: 'Planned for this sitting',
        planned: true,
        completedAt: null,
      },
    ])
  })

  it('shows a task planned in one session and finished in another in both', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { discordId: 'discord-1', createdAt: NOW })
      const first = await ctx.db.insert('session', {
        discordId: 'discord-1',
        userId,
        status: 'ended',
        startedAt: NOW - 3 * H,
        endedAt: NOW - 2 * H,
      })
      const second = await ctx.db.insert('session', {
        discordId: 'discord-1',
        userId,
        status: 'ended',
        startedAt: NOW - 1 * H,
        endedAt: NOW - 30 * M,
      })
      await ctx.db.insert('sessionPartial', {
        sessionId: first,
        discordId: 'discord-1',
        userId,
        channelId: 'chan-a',
        mode: 'voice',
        status: 'ended',
        startedAt: NOW - 3 * H,
        endedAt: NOW - 2 * H,
        durationMs: 1 * H,
      })
      await ctx.db.insert('sessionPartial', {
        sessionId: second,
        discordId: 'discord-1',
        userId,
        channelId: 'chan-a',
        mode: 'voice',
        status: 'ended',
        startedAt: NOW - 1 * H,
        endedAt: NOW - 30 * M,
        durationMs: 30 * M,
      })
      await ctx.db.insert('task', {
        userId,
        title: 'Cross-session task',
        done: true,
        completedAt: NOW - 45 * M,
        plannedAt: DAY_START,
        plannedSessionId: first,
      })
    })

    const res = await t
      .withIdentity({ subject: 'clerk-1' })
      .query(api.sessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    const [later, earlier] = res[0].sessions
    expect(earlier.tasks).toEqual([
      { id: expect.anything(), title: 'Cross-session task', planned: true, completedAt: null },
    ])
    expect(later.tasks).toEqual([
      {
        id: expect.anything(),
        title: 'Cross-session task',
        planned: false,
        completedAt: NOW - 45 * M,
      },
    ])
  })

  it('shows a task planned and finished in the same session once', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { discordId: 'discord-1', createdAt: NOW })
      const sessionId = await ctx.db.insert('session', {
        discordId: 'discord-1',
        userId,
        status: 'ended',
        startedAt: NOW - 1 * H,
        endedAt: NOW - 30 * M,
      })
      await ctx.db.insert('sessionPartial', {
        sessionId,
        discordId: 'discord-1',
        userId,
        channelId: 'chan-a',
        mode: 'voice',
        status: 'ended',
        startedAt: NOW - 1 * H,
        endedAt: NOW - 30 * M,
        durationMs: 30 * M,
      })
      await ctx.db.insert('task', {
        userId,
        title: 'Planned and done',
        done: true,
        completedAt: NOW - 45 * M,
        plannedAt: DAY_START,
        plannedSessionId: sessionId,
      })
    })

    const res = await t
      .withIdentity({ subject: 'clerk-1' })
      .query(api.sessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    expect(res[0].sessions[0].tasks).toEqual([
      {
        id: expect.anything(),
        title: 'Planned and done',
        planned: true,
        completedAt: NOW - 45 * M,
      },
    ])
  })

  it('finds an old task completed today even when it was planned on another Day', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { discordId: 'discord-1', createdAt: NOW })
      const sessionId = await ctx.db.insert('session', {
        discordId: 'discord-1',
        userId,
        status: 'ended',
        startedAt: NOW - 1 * H,
        endedAt: NOW - 30 * M,
      })
      await ctx.db.insert('sessionPartial', {
        sessionId,
        discordId: 'discord-1',
        userId,
        channelId: 'chan-a',
        mode: 'voice',
        status: 'ended',
        startedAt: NOW - 1 * H,
        endedAt: NOW - 30 * M,
        durationMs: 30 * M,
      })
      await ctx.db.insert('task', {
        userId,
        title: 'Planned yesterday',
        done: true,
        completedAt: NOW - 45 * M,
        plannedAt: DAY_START - 24 * H,
      })
    })

    const res = await t
      .withIdentity({ subject: 'clerk-1' })
      .query(api.sessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    expect(res[0].sessions[0].tasks).toEqual([
      {
        id: expect.anything(),
        title: 'Planned yesterday',
        planned: false,
        completedAt: NOW - 45 * M,
      },
    ])
  })

  it("carries the member's active task for the room rail", async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', {
        discordId: 'discord-1',
        name: 'Ada',
        createdAt: NOW,
      })
      const taskId = await ctx.db.insert('task', {
        userId,
        title: 'Read a chapter',
        done: false,
        plannedAt: DAY_START,
      })
      await ctx.db.patch(userId, { activeTaskId: taskId, activeSince: NOW - 5 * M })
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

    expect(res[0].activeTask).toEqual({ id: expect.anything(), title: 'Read a chapter' })
  })

  it('leaves the active task null when the pointer is stale', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', {
        discordId: 'discord-1',
        name: 'Ada',
        createdAt: NOW,
      })
      const taskId = await ctx.db.insert('task', {
        userId,
        title: 'Gone soon',
        done: false,
        plannedAt: DAY_START,
      })
      await ctx.db.patch(userId, { activeTaskId: taskId, activeSince: NOW - 5 * M })
      await ctx.db.delete(taskId)
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

    expect(res[0].activeTask).toBeNull()
  })
})
