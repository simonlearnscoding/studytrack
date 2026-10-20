import { describe, expect, it } from 'vitest'
import type { Doc, Id } from '../_generated/dataModel'
import type { Task } from './types'
import { byPosition, byQueueOrder, pickUpNext, planOrder } from './util'

function task(id: string, done = false): Task {
  return {
    id: id as Id<'task'>,
    title: id,
    done,
    completedAt: done ? 1 : null,
    plannedAt: 0,
    plannedSessionId: null,
  }
}

describe('pickUpNext', () => {
  it('returns the first Open task below the active one', () => {
    const tasks = [task('first'), task('active'), task('below'), task('last')]
    expect(pickUpNext(tasks, 'active' as Id<'task'>)?.id).toBe('below')
  })

  it('skips Done tasks below the active one', () => {
    const tasks = [task('active'), task('done', true), task('open')]
    expect(pickUpNext(tasks, 'active' as Id<'task'>)?.id).toBe('open')
  })

  it('returns the first Open task when nothing is active', () => {
    const tasks = [task('done', true), task('first-open'), task('later-open')]
    expect(pickUpNext(tasks, null)?.id).toBe('first-open')
  })

  it('does not wrap when the active task is last', () => {
    const tasks = [task('open'), task('active')]
    expect(pickUpNext(tasks, 'active' as Id<'task'>)).toBeNull()
  })

  it('returns null when no task is Open', () => {
    expect(pickUpNext([task('a', true), task('b', true)], null)).toBeNull()
  })

  it('falls back to the first Open task when the active task is not in the list', () => {
    const tasks = [task('first-open'), task('later-open')]
    expect(pickUpNext(tasks, 'elsewhere' as Id<'task'>)?.id).toBe('first-open')
  })
})

function row(id: string, creationTime: number, position?: number, done = false): Doc<'task'> {
  return {
    _id: id as Id<'task'>,
    _creationTime: creationTime,
    userId: 'user' as Id<'users'>,
    title: id,
    done,
    plannedAt: 0,
    position,
  }
}

describe('byPosition', () => {
  it('orders by position', () => {
    const rows = [row('c', 3, 2), row('a', 1, 0), row('b', 2, 1)]
    expect(rows.sort(byPosition).map((item) => item._id)).toEqual(['a', 'b', 'c'])
  })

  it('keeps creation order for tasks without a position', () => {
    const rows = [row('later', 2), row('earlier', 1)]
    expect(rows.sort(byPosition).map((item) => item._id)).toEqual(['earlier', 'later'])
  })

  it('puts positioned tasks before unpositioned ones', () => {
    const rows = [row('legacy', 1), row('dragged', 2, 0)]
    expect(rows.sort(byPosition).map((item) => item._id)).toEqual(['dragged', 'legacy'])
  })

  it('breaks a position tie by creation order', () => {
    const rows = [row('second', 2, 0), row('first', 1, 0)]
    expect(rows.sort(byPosition).map((item) => item._id)).toEqual(['first', 'second'])
  })
})

describe('byQueueOrder', () => {
  it('puts Done tasks after every Open task', () => {
    const rows = [row('done', 1, 0, true), row('open', 2, 1), row('also-done', 3, 2, true)]
    expect(rows.sort(byQueueOrder).map((item) => item._id)).toEqual(['open', 'done', 'also-done'])
  })

  it('keeps manual order inside each group', () => {
    const rows = [row('open-b', 1, 1), row('open-a', 2, 0), row('done-b', 3, 1, true)]
    expect(rows.sort(byQueueOrder).map((item) => item._id)).toEqual(['open-a', 'open-b', 'done-b'])
  })
})

describe('planOrder', () => {
  const rows = [row('a', 1, 0), row('b', 2, 1), row('c', 3, 2)]

  it('returns the sent order', () => {
    const ordered = planOrder(rows, ['c', 'a', 'b'] as Id<'task'>[])
    expect(ordered.map((item) => item._id)).toEqual(['c', 'a', 'b'])
  })

  it('appends tasks the caller did not send', () => {
    const ordered = planOrder(rows, ['b', 'a'] as Id<'task'>[])
    expect(ordered.map((item) => item._id)).toEqual(['b', 'a', 'c'])
  })

  it('rejects an id that is not in the Day', () => {
    expect(() => planOrder(rows, ['a', 'elsewhere'] as Id<'task'>[])).toThrow(/Task not found/)
  })
})
