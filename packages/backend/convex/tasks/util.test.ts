import { describe, expect, it } from 'vitest'
import type { Doc, Id } from '../_generated/dataModel'
import type { Task } from './types'
import {
  byPosition,
  byQueueOrder,
  insertionIndex,
  pickNowTask,
  pickUpNext,
  planOrder,
  type TaskPlanWindow,
} from './util'

function task(id: string, done = false): Task {
  return {
    id: id as Id<'task'>,
    title: id,
    done,
    completedAt: done ? 1 : null,
    plannedAt: 0,
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

describe('insertionIndex', () => {
  const rows = [row('now', 1, 0), row('second', 2, 1), row('done', 3, 2, true)]

  it('appends at the bottom for end', () => {
    expect(insertionIndex(rows, 'end')).toBe(rows.length)
  })

  it('lands on top for now', () => {
    expect(insertionIndex(rows, 'now')).toBe(0)
  })

  it('lands right after the current Now for next', () => {
    expect(insertionIndex(rows, 'next')).toBe(1)
  })

  it('puts next on top when the Day has no Open task', () => {
    expect(insertionIndex([row('done', 1, 0, true)], 'next')).toBe(0)
  })

  it('accepts every placement on an empty Day', () => {
    expect(insertionIndex([], 'end')).toBe(0)
    expect(insertionIndex([], 'now')).toBe(0)
    expect(insertionIndex([], 'next')).toBe(0)
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

function planMap(entries: Array<[string, number, number]>) {
  return new Map<Id<'task'>, TaskPlanWindow>(
    entries.map(([id, plannedStart, plannedEnd]) => [
      id as Id<'task'>,
      {
        planBlockId: `plan-${id}` as Id<'planBlock'>,
        plannedStart,
        plannedEnd,
      },
    ])
  )
}

describe('pickNowTask', () => {
  it('leads with the live plan over an earlier unscheduled task', () => {
    const rows = [row('unscheduled', 1, 0), row('live', 2, 1)]
    const plans = planMap([['live', 9, 11]])
    expect(pickNowTask(rows, plans, 10)?._id).toBe('live')
  })

  it('uses the live plan queue order', () => {
    const rows = [row('live-b', 1, 1), row('live-a', 2, 0)]
    const plans = planMap([
      ['live-b', 9, 11],
      ['live-a', 9, 11],
    ])
    expect(pickNowTask(rows, plans, 10)?._id).toBe('live-a')
  })

  it('falls back to the unscheduled queue when the live plan has no open task', () => {
    const rows = [row('done-live', 1, 0, true), row('unscheduled', 2, 1)]
    const plans = planMap([['done-live', 9, 11]])
    expect(pickNowTask(rows, plans, 10)?._id).toBe('unscheduled')
  })

  it('prefers unscheduled work over an upcoming plan', () => {
    const rows = [row('unscheduled', 1, 0), row('upcoming', 2, 1)]
    const plans = planMap([['upcoming', 12, 13]])
    expect(pickNowTask(rows, plans, 10)?._id).toBe('unscheduled')
  })

  it('falls to the earliest upcoming plan when nothing is live or unscheduled', () => {
    const rows = [row('later', 1, 0), row('soon', 2, 1)]
    const plans = planMap([
      ['later', 14, 15],
      ['soon', 12, 13],
    ])
    expect(pickNowTask(rows, plans, 10)?._id).toBe('soon')
  })

  it('treats a task whose plan ended as unscheduled', () => {
    const rows = [row('ended-plan', 1, 0)]
    const plans = planMap([['ended-plan', 8, 9]])
    expect(pickNowTask(rows, plans, 10)?._id).toBe('ended-plan')
  })
})
