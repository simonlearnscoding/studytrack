import { describe, expect, it } from 'vitest'
import type { Id } from '../_generated/dataModel'
import type { Task } from './types'
import { pickUpNext } from './util'

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
