import { describe, expect, it } from 'vitest'
import type { Id } from '../_generated/dataModel'
import {
  planAt,
  resolvePlanDraft,
  resolvePlanEdit,
  resolvePlanStart,
  type PlanSpan,
} from './gesture'
import type { TimelinePlanBlockVM } from './types'
import { minuteToPx, resolveWindow } from './util'

// 608px: a 32px/h core after a 32px collapsed band. The window's segments do
// not depend on `nowMin`, so one fixture serves every gesture.
const FLOOR_PX = 608
const window = resolveWindow({ nowMin: 8 * 60, availablePx: FLOOR_PX })
const segments = window.segments
const axisWidthPx = window.widthPx
const nowPx = px(8 * 60)

function px(minute: number): number {
  return minuteToPx(segments, minute)!
}

function plan(id: string, startMin: number, endMin: number): TimelinePlanBlockVM {
  return {
    id: id as Id<'plannedSession'>,
    startPx: px(startMin),
    endPx: px(endMin),
  }
}

const draft = (fromMin: number, toMin: number, blocks: TimelinePlanBlockVM[] = []) =>
  resolvePlanDraft({
    segments,
    axisWidthPx,
    blocks,
    fromPx: px(fromMin),
    toPx: px(toMin),
    nowPx,
  })

const edit = (over: {
  blocks: TimelinePlanBlockVM[]
  planId: string
  edge: 'move' | 'start' | 'end'
  pointerMin: number
  grabMin?: number
}) =>
  resolvePlanEdit({
    segments,
    axisWidthPx,
    blocks: over.blocks,
    planId: over.planId as Id<'plannedSession'>,
    edge: over.edge,
    pointerPx: px(over.pointerMin),
    grabPx: over.grabMin == null ? undefined : px(over.grabMin),
    nowPx,
  })

const minutes = (span: PlanSpan | null) => (span ? [span.startMin, span.endMin] : null)

describe('resolvePlanStart', () => {
  it('snaps the pointer to the nearest quarter-hour', () => {
    expect(resolvePlanStart({ segments, px: px(10 * 60 + 7), nowPx, blocks: [] })).toEqual({
      startPx: px(10 * 60),
      startMin: 10 * 60,
    })
    expect(resolvePlanStart({ segments, px: px(10 * 60 + 23), nowPx, blocks: [] })?.startMin).toBe(
      10 * 60 + 30
    )
  })

  it('refuses a start before now’s quarter-hour', () => {
    expect(resolvePlanStart({ segments, px: px(7 * 60 + 50), nowPx, blocks: [] })).toBeNull()
  })

  it('refuses a start on top of an existing plan', () => {
    const blocks = [plan('a', 10 * 60, 11 * 60)]
    expect(resolvePlanStart({ segments, px: px(10 * 60 + 30), nowPx, blocks })).toBeNull()
  })

  it('refuses a start hidden in the collapsed night band', () => {
    expect(resolvePlanStart({ segments, px: 10, nowPx, blocks: [] })).toBeNull()
  })
})

describe('resolvePlanDraft', () => {
  it('snaps both ends to the grid', () => {
    expect(minutes(draft(10 * 60 + 2, 10 * 60 + 32))).toEqual([10 * 60, 10 * 60 + 30])
    expect(draft(10 * 60 + 2, 10 * 60 + 32)?.leftPx).toBe(px(10 * 60))
    expect(draft(10 * 60 + 2, 10 * 60 + 32)?.widthPx).toBe(px(10 * 60 + 30) - px(10 * 60))
  })

  it('gives the same span dragging backwards', () => {
    expect(draft(10 * 60 + 32, 10 * 60 + 2)).toEqual(draft(10 * 60 + 2, 10 * 60 + 32))
  })

  it('never starts before now’s quarter-hour', () => {
    expect(minutes(draft(7 * 60 + 42, 10 * 60 + 30))?.[0]).toBe(8 * 60)
  })

  it('stops at the next plan', () => {
    const blocks = [plan('next', 11 * 60, 12 * 60)]
    expect(minutes(draft(10 * 60, 13 * 60, blocks))).toEqual([10 * 60, 11 * 60])
  })

  it('stops a backwards drag at the previous plan’s end', () => {
    const blocks = [plan('previous', 9 * 60, 9 * 60 + 30)]
    expect(minutes(draft(10 * 60, 8 * 60 + 30, blocks))).toEqual([9 * 60 + 30, 10 * 60])
  })

  it('has no span inside a collapsed band', () => {
    const span = resolvePlanDraft({
      segments,
      axisWidthPx,
      blocks: [],
      fromPx: 2,
      toPx: 20,
      nowPx: 2,
    })
    expect(span).toBeNull()
  })

  it('reports whole minutes', () => {
    const span = draft(10 * 60 + 2, 10 * 60 + 32)!
    expect(Number.isInteger(span.startMin)).toBe(true)
    expect(Number.isInteger(span.endMin)).toBe(true)
  })
})

describe('resolvePlanEdit — move', () => {
  const blocks = [plan('a', 10 * 60, 11 * 60)]

  it('moves by the pointer delta and snaps to the grid', () => {
    expect(
      minutes(
        edit({ blocks, planId: 'a', edge: 'move', grabMin: 10 * 60 + 30, pointerMin: 10 * 60 + 50 })
      )
    ).toEqual([10 * 60 + 15, 11 * 60 + 15])
  })

  it('stops at the previous plan’s end', () => {
    const withPrevious = [...blocks, plan('previous', 9 * 60, 9 * 60 + 30)]
    expect(
      minutes(
        edit({
          blocks: withPrevious,
          planId: 'a',
          edge: 'move',
          grabMin: 10 * 60 + 30,
          pointerMin: 8 * 60,
        })
      )
    ).toEqual([9 * 60 + 30, 10 * 60 + 30])
  })

  it('stops at the next plan’s start', () => {
    const withNext = [...blocks, plan('next', 12 * 60, 13 * 60)]
    expect(
      minutes(
        edit({
          blocks: withNext,
          planId: 'a',
          edge: 'move',
          grabMin: 10 * 60 + 30,
          pointerMin: 13 * 60,
        })
      )
    ).toEqual([11 * 60, 12 * 60])
  })

  it('has no geometry when the past wall is past the last legal left', () => {
    const late = resolvePlanEdit({
      segments,
      axisWidthPx,
      blocks: [plan('late', 23 * 60, 24 * 60)],
      planId: 'late' as Id<'plannedSession'>,
      edge: 'move',
      pointerPx: px(23 * 60 + 30),
      grabPx: px(23 * 60 + 30),
      nowPx: px(23 * 60 + 30),
    })
    expect(late).toBeNull()
  })
})

describe('resolvePlanEdit — resize', () => {
  const blocks = [plan('a', 10 * 60, 11 * 60)]

  it('drags the start edge and snaps it', () => {
    expect(minutes(edit({ blocks, planId: 'a', edge: 'start', pointerMin: 9 * 60 + 40 }))).toEqual([
      9 * 60 + 45,
      11 * 60,
    ])
  })

  it('stops the start edge at the previous plan', () => {
    const withPrevious = [...blocks, plan('previous', 9 * 60, 9 * 60 + 30)]
    expect(
      minutes(edit({ blocks: withPrevious, planId: 'a', edge: 'start', pointerMin: 8 * 60 }))
    ).toEqual([9 * 60 + 30, 11 * 60])
  })

  it('stops the start edge at now’s quarter-hour', () => {
    const span = resolvePlanEdit({
      segments,
      axisWidthPx,
      blocks,
      planId: 'a' as Id<'plannedSession'>,
      edge: 'start',
      pointerPx: px(8 * 60),
      nowPx: px(10 * 60 + 15),
    })
    expect(minutes(span)).toEqual([10 * 60 + 15, 11 * 60])
  })

  it('stops the end edge at the next plan', () => {
    const withNext = [...blocks, plan('next', 11 * 60 + 15, 13 * 60)]
    expect(
      minutes(edit({ blocks: withNext, planId: 'a', edge: 'end', pointerMin: 13 * 60 }))
    ).toEqual([10 * 60, 11 * 60 + 15])
  })

  it('keeps at least one snap step of plan', () => {
    expect(minutes(edit({ blocks, planId: 'a', edge: 'end', pointerMin: 10 * 60 }))).toEqual([
      10 * 60,
      10 * 60 + 15,
    ])
    expect(minutes(edit({ blocks, planId: 'a', edge: 'start', pointerMin: 13 * 60 }))).toEqual([
      10 * 60 + 45,
      11 * 60,
    ])
  })

  it('has no geometry for an unknown plan', () => {
    expect(edit({ blocks, planId: 'missing', edge: 'end', pointerMin: 12 * 60 })).toBeNull()
  })
})

describe('planAt', () => {
  const blocks = [plan('a', 10 * 60, 11 * 60)]

  it('includes the start and excludes the end', () => {
    expect(planAt(blocks, px(10 * 60))?.id).toBe('a')
    expect(planAt(blocks, px(11 * 60))).toBeNull()
    expect(planAt(blocks, px(10 * 60) - 1)).toBeNull()
  })
})
