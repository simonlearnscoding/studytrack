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

describe('workSessions.getTodaysActivitiesForDashboard', () => {
  it('returns nothing when unauthenticated', async () => {
    const t = convexTest(schema, modules)
    const res = await t.query(api.workSessions.getTodaysActivitiesForDashboard, {
      dayStart: DAY_START,
    })
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
      const workSessionId = await ctx.db.insert('workSession', {
        discordId: 'discord-1',
        userId,
        guildId: 'guild-1',
        status: 'active',
        startedAt: NOW - 30 * M,
      })
      await ctx.db.insert('workSessionPartial', {
        workSessionId,
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
      .query(api.workSessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    expect(res).toHaveLength(1)
    expect(res[0]).toMatchObject({
      discordId: 'discord-1',
      name: 'Ada',
      image: 'https://img/ada.png',
      online: true,
    })
    expect(res[0].workSessions).toHaveLength(1)
    expect(res[0].workSessions[0]).toMatchObject({ status: 'active', endedAt: null })
    expect(res[0].workSessions[0].partials[0]).toEqual({
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
      const workSessionId = await ctx.db.insert('workSession', {
        discordId: 'discord-1',
        guildId: 'guild-1',
        status: 'ended',
        startedAt: NOW - 2 * H,
        endedAt: NOW - 30 * M,
      })
      await ctx.db.insert('workSessionPartial', {
        workSessionId,
        discordId: 'discord-1',
        guildId: 'guild-1',
        channelId: 'chan-a',
        mode: 'voice',
        status: 'ended',
        startedAt: NOW - 2 * H,
        endedAt: NOW - 1 * H,
        durationMs: 1 * H,
      })
      await ctx.db.insert('workSessionPartial', {
        workSessionId,
        discordId: 'discord-1',
        guildId: 'guild-1',
        mode: 'break',
        status: 'ended',
        startedAt: NOW - 1 * H,
        endedAt: NOW - 50 * M,
        durationMs: 10 * M,
      })
      await ctx.db.insert('workSessionPartial', {
        workSessionId,
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
      .query(api.workSessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    expect(res).toHaveLength(1)
    expect(res[0].online).toBe(false)
    expect(res[0].workSessions[0].partials).toHaveLength(3)
    expect(res[0].workSessions[0].partials.map((p) => p.mode)).toContain('break')
    // Newest partial first.
    expect(res[0].workSessions[0].partials[0].mode).toBe('cameraAndScreenShare')
  })

  it('hides a workSession that started and ended before today', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const workSessionId = await ctx.db.insert('workSession', {
        discordId: 'discord-1',
        guildId: 'guild-1',
        status: 'ended',
        startedAt: DAY_START - 3 * H,
        endedAt: DAY_START - 2 * H,
      })
      await ctx.db.insert('workSessionPartial', {
        workSessionId,
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
      .query(api.workSessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })
    expect(res).toEqual([])
  })

  it('keeps an active workSession that straddled midnight', async () => {
    const t = convexTest(schema, modules)
    const startedAt = DAY_START - 3 * H
    await t.run(async (ctx) => {
      const workSessionId = await ctx.db.insert('workSession', {
        discordId: 'discord-1',
        guildId: 'guild-1',
        status: 'active',
        startedAt,
      })
      await ctx.db.insert('workSessionPartial', {
        workSessionId,
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
      .query(api.workSessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    expect(res).toHaveLength(1)
    expect(res[0].online).toBe(true)
    expect(res[0].workSessions[0].partials[0].startedAt).toBe(startedAt)
  })

  it('bounds a closed Day to its own window', async () => {
    const t = convexTest(schema, modules)
    const nextDay = DAY_START + 24 * H
    await t.run(async (ctx) => {
      for (const [discordId, startedAt] of [
        ['before', DAY_START - 2 * H],
        ['selected', DAY_START + 9 * H],
        ['after', nextDay + 9 * H],
      ] as const) {
        const workSessionId = await ctx.db.insert('workSession', {
          discordId,
          guildId: 'guild-1',
          status: 'ended',
          startedAt,
          endedAt: startedAt + H,
        })
        await ctx.db.insert('workSessionPartial', {
          workSessionId,
          discordId,
          guildId: 'guild-1',
          channelId: 'chan-a',
          mode: 'voice',
          status: 'ended',
          startedAt,
          endedAt: startedAt + H,
          durationMs: 1 * H,
        })
      }
    })

    const res = await t
      .withIdentity({ subject: 'clerk-1' })
      .query(api.workSessions.getTodaysActivitiesForDashboard, {
        dayStart: DAY_START,
        todayStart: nextDay,
      })

    expect(res.map((member) => member.discordId)).toEqual(['selected'])
  })

  it('leaves a running Session out of a closed Day', async () => {
    const t = convexTest(schema, modules)
    const startedAt = NOW - 30 * M
    await t.run(async (ctx) => {
      const workSessionId = await ctx.db.insert('workSession', {
        discordId: 'discord-1',
        guildId: 'guild-1',
        status: 'active',
        startedAt,
      })
      await ctx.db.insert('workSessionPartial', {
        workSessionId,
        discordId: 'discord-1',
        guildId: 'guild-1',
        channelId: 'chan-a',
        mode: 'voice',
        status: 'active',
        startedAt,
      })
    })

    const closed = await t
      .withIdentity({ subject: 'clerk-1' })
      .query(api.workSessions.getTodaysActivitiesForDashboard, {
        dayStart: DAY_START - 24 * H,
        todayStart: DAY_START,
      })
    expect(closed).toEqual([])

    const live = await t
      .withIdentity({ subject: 'clerk-1' })
      .query(api.workSessions.getTodaysActivitiesForDashboard, {
        dayStart: DAY_START,
        todayStart: DAY_START,
      })
    expect(live).toHaveLength(1)
    expect(live[0].online).toBe(true)
  })

  it('groups several workSessions into one member card', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const first = await ctx.db.insert('workSession', {
        discordId: 'discord-1',
        guildId: 'guild-1',
        status: 'ended',
        startedAt: NOW - 4 * H,
        endedAt: NOW - 3 * H,
      })
      await ctx.db.insert('workSessionPartial', {
        workSessionId: first,
        discordId: 'discord-1',
        guildId: 'guild-1',
        channelId: 'chan-a',
        mode: 'voice',
        status: 'ended',
        startedAt: NOW - 4 * H,
        endedAt: NOW - 3 * H,
        durationMs: 1 * H,
      })
      const second = await ctx.db.insert('workSession', {
        discordId: 'discord-1',
        guildId: 'guild-1',
        status: 'active',
        startedAt: NOW - 20 * M,
      })
      await ctx.db.insert('workSessionPartial', {
        workSessionId: second,
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
      .query(api.workSessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    expect(res).toHaveLength(1)
    expect(res[0].workSessions).toHaveLength(2)
    expect(res[0].online).toBe(true)
    // WorkSessions newest first.
    expect(res[0].workSessions[0].status).toBe('active')
  })

  it('binds each completed task to the workSession containing its completion instant', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', {
        discordId: 'discord-1',
        name: 'Ada',
        createdAt: NOW,
      })
      const workSessionId = await ctx.db.insert('workSession', {
        discordId: 'discord-1',
        userId,
        guildId: 'guild-1',
        status: 'ended',
        startedAt: NOW - 2 * H,
        endedAt: NOW - 1 * H,
      })
      await ctx.db.insert('workSessionPartial', {
        workSessionId,
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
      // Completed inside the workSession — bound.
      await ctx.db.insert('task', {
        userId,
        title: 'Read a chapter',
        done: true,
        completedAt: NOW - 90 * M,
        plannedAt: DAY_START,
      })
      // Completed before it started — no workSession owns it.
      await ctx.db.insert('task', {
        userId,
        title: 'Before the workSession',
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
      .query(api.workSessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    const tasks = res[0].workSessions[0].tasks
    expect(tasks.map((task) => task.title)).toEqual(['Read a chapter'])
    expect(tasks[0].completedAt).toBe(NOW - 90 * M)
  })

  it('binds tasks to a still-running workSession by its open end', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { discordId: 'discord-1', createdAt: NOW })
      const workSessionId = await ctx.db.insert('workSession', {
        discordId: 'discord-1',
        userId,
        guildId: 'guild-1',
        status: 'active',
        startedAt: NOW - 30 * M,
      })
      await ctx.db.insert('workSessionPartial', {
        workSessionId,
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
        title: 'Finished mid-workSession',
        done: true,
        completedAt: NOW - 5 * M,
        plannedAt: DAY_START,
      })
    })

    const res = await t
      .withIdentity({ subject: 'clerk-1' })
      .query(api.workSessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    expect(res[0].workSessions[0].tasks.map((task) => task.title)).toEqual([
      'Finished mid-workSession',
    ])
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
        const workSessionId = await ctx.db.insert('workSession', {
          discordId,
          userId,
          guildId: 'guild-1',
          status: 'ended',
          startedAt: NOW - 2 * H,
          endedAt: NOW - 1 * H,
        })
        await ctx.db.insert('workSessionPartial', {
          workSessionId,
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
      .query(api.workSessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    const ada = res.find((member) => member.discordId === 'ada')
    const bob = res.find((member) => member.discordId === 'bob')
    expect(ada?.workSessions[0].tasks.map((task) => task.title)).toEqual(['Ada private task'])
    expect(bob?.workSessions[0].tasks).toEqual([])
  })

  it('finds an old task completed today even when it was planned on another Day', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { discordId: 'discord-1', createdAt: NOW })
      const workSessionId = await ctx.db.insert('workSession', {
        discordId: 'discord-1',
        userId,
        status: 'ended',
        startedAt: NOW - 1 * H,
        endedAt: NOW - 30 * M,
      })
      await ctx.db.insert('workSessionPartial', {
        workSessionId,
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
      .query(api.workSessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    expect(res[0].workSessions[0].tasks).toEqual([
      {
        id: expect.anything(),
        title: 'Planned yesterday',
        completedAt: NOW - 45 * M,
      },
    ])
  })

  it("carries the member's Now — today's top Open task — for the room rail", async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', {
        discordId: 'discord-1',
        name: 'Ada',
        createdAt: NOW,
      })
      await ctx.db.insert('task', {
        userId,
        title: 'Done first',
        done: true,
        plannedAt: DAY_START,
        position: 0,
      })
      await ctx.db.insert('task', {
        userId,
        title: 'Second',
        done: false,
        plannedAt: DAY_START,
        position: 2,
      })
      await ctx.db.insert('task', {
        userId,
        title: 'First',
        done: false,
        plannedAt: DAY_START,
        position: 1,
      })
      const workSessionId = await ctx.db.insert('workSession', {
        discordId: 'discord-1',
        userId,
        guildId: 'guild-1',
        status: 'active',
        startedAt: NOW - 30 * M,
      })
      await ctx.db.insert('workSessionPartial', {
        workSessionId,
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
      .query(api.workSessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    expect(res[0].activeTask).toEqual({ id: expect.anything(), title: 'First' })
  })

  it('leaves Now null when the Day has no Open tasks', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', {
        discordId: 'discord-1',
        name: 'Ada',
        createdAt: NOW,
      })
      await ctx.db.insert('task', {
        userId,
        title: 'All done',
        done: true,
        plannedAt: DAY_START,
        position: 0,
      })
      const workSessionId = await ctx.db.insert('workSession', {
        discordId: 'discord-1',
        userId,
        guildId: 'guild-1',
        status: 'active',
        startedAt: NOW - 30 * M,
      })
      await ctx.db.insert('workSessionPartial', {
        workSessionId,
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
      .query(api.workSessions.getTodaysActivitiesForDashboard, { dayStart: DAY_START })

    expect(res[0].activeTask).toBeNull()
  })
})
