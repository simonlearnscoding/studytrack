import { describe, expect, it } from 'vitest'
import { countPlanTasks, planPhase } from './util'

const H = 60 * 60 * 1000
const START = 14 * H
const END = 15 * H

describe('planPhase', () => {
  it('is upcoming before the start, live inside the window and past after it', () => {
    expect(planPhase(START, END, START - 1)).toBe('upcoming')
    expect(planPhase(START, END, START)).toBe('live')
    expect(planPhase(START, END, END - 1)).toBe('live')
    expect(planPhase(START, END, END)).toBe('past')
  })
})

describe('countPlanTasks', () => {
  it('counts an Open task separately from a Done one', () => {
    expect(countPlanTasks([{ done: false, completedAt: null }], START, END)).toEqual({
      doneInside: 0,
      doneOutside: 0,
      doneUnknownTime: 0,
      open: 1,
    })
  })

  it('counts a completion inside the window, and the end instant belongs to the next block', () => {
    expect(countPlanTasks([{ done: true, completedAt: START }], START, END).doneInside).toBe(1)
    expect(countPlanTasks([{ done: true, completedAt: END - 1 }], START, END).doneInside).toBe(1)
    expect(countPlanTasks([{ done: true, completedAt: END }], START, END).doneInside).toBe(0)
    expect(countPlanTasks([{ done: true, completedAt: END }], START, END).doneOutside).toBe(1)
  })

  it('keeps a Done task with no instant out of both inside and outside', () => {
    expect(countPlanTasks([{ done: true, completedAt: null }], START, END)).toEqual({
      doneInside: 0,
      doneOutside: 0,
      doneUnknownTime: 1,
      open: 0,
    })
  })
})
