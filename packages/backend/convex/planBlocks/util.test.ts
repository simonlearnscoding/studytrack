import { describe, expect, it } from 'vitest'
import {
  countPlanTasks,
  countdownTone,
  planBlockDraftProposal,
  planCountdown,
  planPhase,
} from './util'

const MIN = 60 * 1000
const H = 60 * MIN
const START = 14 * H
const END = 15 * H
const DAY_END = 24 * H

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

describe('planBlockDraftProposal', () => {
  const proposal = (now: number, planBlocks: { plannedStart: number; plannedEnd: number }[] = []) =>
    planBlockDraftProposal({ dayStart: 0, dayEnd: DAY_END, now, planBlocks })

  it('proposes the next quarter plus the lane double-click span', () => {
    expect(proposal(10 * H + 7 * MIN)).toEqual({
      kind: 'window',
      startAt: 10 * H + 15 * MIN,
      endAt: 12 * H + 15 * MIN,
    })
  })

  it('starts now when the clock is already on a quarter', () => {
    expect(proposal(10 * H)).toEqual({ kind: 'window', startAt: 10 * H, endAt: 12 * H })
  })

  it('clamps the end to the Day boundary', () => {
    expect(proposal(22 * H + 30 * MIN)).toEqual({
      kind: 'window',
      startAt: 22 * H + 30 * MIN,
      endAt: DAY_END,
    })
  })

  it('still offers the last quarter-hour of the Day', () => {
    expect(proposal(23 * H + 45 * MIN)).toEqual({
      kind: 'window',
      startAt: 23 * H + 45 * MIN,
      endAt: DAY_END,
    })
  })

  it('reports no room once the next quarter is past the Day', () => {
    expect(proposal(23 * H + 46 * MIN)).toEqual({ kind: 'no-room' })
  })

  it('opens blank when the proposal overlaps an existing block', () => {
    expect(
      proposal(10 * H + 7 * MIN, [
        { plannedStart: 10 * H + 15 * MIN, plannedEnd: 11 * H + 15 * MIN },
      ])
    ).toEqual({ kind: 'blank' })
  })

  it('keeps a proposal that only touches another block at its edge', () => {
    expect(
      proposal(10 * H + 7 * MIN, [{ plannedStart: 8 * H, plannedEnd: 10 * H + 15 * MIN }])
    ).toEqual({
      kind: 'window',
      startAt: 10 * H + 15 * MIN,
      endAt: 12 * H + 15 * MIN,
    })
  })
})

describe('planCountdown', () => {
  const LATER_START = 16 * H
  const LATER_END = 17 * H

  it('counts down to the end of the block that covers now', () => {
    expect(planCountdown([{ plannedStart: START, plannedEnd: END }], START + 12 * MIN)).toEqual({
      kind: 'live',
      startsAt: START,
      endsAt: END,
      leftMs: 48 * MIN,
      drained: 0.2,
      tone: 'normal',
    })
  })

  it('counts up to the next block when nothing covers now', () => {
    expect(
      planCountdown(
        [
          { plannedStart: START, plannedEnd: END },
          { plannedStart: LATER_START, plannedEnd: LATER_END },
        ],
        END + 10 * MIN
      )
    ).toEqual({ kind: 'upcoming', startsAt: LATER_START, untilMs: LATER_START - (END + 10 * MIN) })
  })

  it('says nothing when the Day has no block left', () => {
    expect(planCountdown([], START)).toEqual({ kind: 'none' })
    expect(planCountdown([{ plannedStart: START, plannedEnd: END }], END)).toEqual({ kind: 'none' })
  })

  it('gives the end instant to the next block, so touching blocks never both read live', () => {
    expect(
      planCountdown(
        [
          { plannedStart: START, plannedEnd: END },
          { plannedStart: END, plannedEnd: LATER_END },
        ],
        END
      )
    ).toEqual({
      kind: 'live',
      startsAt: END,
      endsAt: LATER_END,
      leftMs: LATER_END - END,
      drained: 0,
      tone: 'normal',
    })
  })

  it('takes the earliest upcoming block whatever order the Day arrives in', () => {
    expect(
      planCountdown(
        [
          { plannedStart: LATER_START, plannedEnd: LATER_END },
          { plannedStart: END, plannedEnd: END + H },
        ],
        START - H
      )
    ).toEqual({ kind: 'upcoming', startsAt: END, untilMs: END - (START - H) })
  })
})

describe('countdownTone', () => {
  const HOUR = 60 * MIN

  it('goes low in the last ten minutes of a long block', () => {
    expect(countdownTone(11 * MIN, HOUR)).toBe('normal')
    expect(countdownTone(10 * MIN, HOUR)).toBe('low')
    expect(countdownTone(0, HOUR)).toBe('low')
  })

  it('scales the lead to a short block instead of going low for most of it', () => {
    expect(countdownTone(4 * MIN, 12 * MIN)).toBe('normal')
    expect(countdownTone(3 * MIN, 12 * MIN)).toBe('low')
  })
})
