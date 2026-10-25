import { describe, expect, it } from 'vitest'
import type { Id } from '../_generated/dataModel'
import {
  planBlockAt,
  resolvePlanBlockDraft,
  resolvePlanBlockEdit,
  resolvePlanBlockStart,
  type PlanBlockSpan,
} from './gesture'
import type { TimelinePlanBlockWallVM } from './types'
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

function plan(id: string, startMin: number, endMin: number): TimelinePlanBlockWallVM {
  return {
    id: id as Id<'planBlock'>,
    title: null,
    startPx: px(startMin),
    endPx: px(endMin),
    locked: false,
  }
}

const draft = (fromMin: number, toMin: number, blocks: TimelinePlanBlockWallVM[] = []) =>
  resolvePlanBlockDraft({
    segments,
    axisWidthPx,
    blocks,
    fromPx: px(fromMin),
    toPx: px(toMin),
    nowPx,
  })

const edit = (over: {
  blocks: TimelinePlanBlockWallVM[]
  planBlockId: string
  edge: 'move' | 'start' | 'end'
  pointerMin: number
  grabMin?: number
}) =>
  resolvePlanBlockEdit({
    segments,
    axisWidthPx,
    blocks: over.blocks,
    planBlockId: over.planBlockId as Id<'planBlock'>,
    edge: over.edge,
    pointerPx: px(over.pointerMin),
    grabPx: over.grabMin == null ? undefined : px(over.grabMin),
    nowPx,
  })

const minutes = (span: PlanBlockSpan | null) => (span ? [span.startMin, span.endMin] : null)

describe('resolvePlanBlockStart', () => {
  it('snaps the pointer to the nearest quarter-hour', () => {
    expect(resolvePlanBlockStart({ segments, px: px(10 * 60 + 7), nowPx, blocks: [] })).toEqual({
      startPx: px(10 * 60),
      startMin: 10 * 60,
    })
    expect(
      resolvePlanBlockStart({ segments, px: px(10 * 60 + 23), nowPx, blocks: [] })?.startMin
    ).toBe(10 * 60 + 30)
  })

  it('refuses a start before now’s quarter-hour', () => {
    expect(resolvePlanBlockStart({ segments, px: px(7 * 60 + 50), nowPx, blocks: [] })).toBeNull()
  })

  it('refuses a start on top of an existing plan', () => {
    const blocks = [plan('a', 10 * 60, 11 * 60)]
    expect(resolvePlanBlockStart({ segments, px: px(10 * 60 + 30), nowPx, blocks })).toBeNull()
  })

  it('refuses a start hidden in the collapsed night band', () => {
    expect(resolvePlanBlockStart({ segments, px: 10, nowPx, blocks: [] })).toBeNull()
  })
})

describe('resolvePlanBlockDraft', () => {
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
    const span = resolvePlanBlockDraft({
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

describe('resolvePlanBlockEdit — move', () => {
  const blocks = [plan('a', 10 * 60, 11 * 60)]

  it('moves by the pointer delta and snaps to the grid', () => {
    expect(
      minutes(
        edit({
          blocks,
          planBlockId: 'a',
          edge: 'move',
          grabMin: 10 * 60 + 30,
          pointerMin: 10 * 60 + 50,
        })
      )
    ).toEqual([10 * 60 + 15, 11 * 60 + 15])
  })

  it('stops at the previous plan’s end', () => {
    const withPrevious = [...blocks, plan('previous', 9 * 60, 9 * 60 + 30)]
    expect(
      minutes(
        edit({
          blocks: withPrevious,
          planBlockId: 'a',
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
          planBlockId: 'a',
          edge: 'move',
          grabMin: 10 * 60 + 30,
          pointerMin: 13 * 60,
        })
      )
    ).toEqual([11 * 60, 12 * 60])
  })

  it('has no geometry when the past wall is past the last legal left', () => {
    const late = resolvePlanBlockEdit({
      segments,
      axisWidthPx,
      blocks: [plan('late', 23 * 60, 24 * 60)],
      planBlockId: 'late' as Id<'planBlock'>,
      edge: 'move',
      pointerPx: px(23 * 60 + 30),
      grabPx: px(23 * 60 + 30),
      nowPx: px(23 * 60 + 30),
    })
    expect(late).toBeNull()
  })
})

describe('resolvePlanBlockEdit — resize', () => {
  const blocks = [plan('a', 10 * 60, 11 * 60)]

  it('drags the start edge and snaps it', () => {
    expect(
      minutes(edit({ blocks, planBlockId: 'a', edge: 'start', pointerMin: 9 * 60 + 40 }))
    ).toEqual([9 * 60 + 45, 11 * 60])
  })

  it('stops the start edge at the previous plan', () => {
    const withPrevious = [...blocks, plan('previous', 9 * 60, 9 * 60 + 30)]
    expect(
      minutes(edit({ blocks: withPrevious, planBlockId: 'a', edge: 'start', pointerMin: 8 * 60 }))
    ).toEqual([9 * 60 + 30, 11 * 60])
  })

  it('stops the start edge at now’s quarter-hour', () => {
    const span = resolvePlanBlockEdit({
      segments,
      axisWidthPx,
      blocks,
      planBlockId: 'a' as Id<'planBlock'>,
      edge: 'start',
      pointerPx: px(8 * 60),
      nowPx: px(10 * 60 + 15),
    })
    expect(minutes(span)).toEqual([10 * 60 + 15, 11 * 60])
  })

  it('stops the end edge at the next plan', () => {
    const withNext = [...blocks, plan('next', 11 * 60 + 15, 13 * 60)]
    expect(
      minutes(edit({ blocks: withNext, planBlockId: 'a', edge: 'end', pointerMin: 13 * 60 }))
    ).toEqual([10 * 60, 11 * 60 + 15])
  })

  it('keeps at least one snap step of plan', () => {
    expect(minutes(edit({ blocks, planBlockId: 'a', edge: 'end', pointerMin: 10 * 60 }))).toEqual([
      10 * 60,
      10 * 60 + 15,
    ])
    expect(minutes(edit({ blocks, planBlockId: 'a', edge: 'start', pointerMin: 13 * 60 }))).toEqual(
      [10 * 60 + 45, 11 * 60]
    )
  })

  it('has no geometry for an unknown plan', () => {
    expect(edit({ blocks, planBlockId: 'missing', edge: 'end', pointerMin: 12 * 60 })).toBeNull()
  })
})

describe('planBlockAt', () => {
  const blocks = [plan('a', 10 * 60, 11 * 60)]

  it('includes the start and excludes the end', () => {
    expect(planBlockAt(blocks, px(10 * 60))?.id).toBe('a')
    expect(planBlockAt(blocks, px(11 * 60))).toBeNull()
    expect(planBlockAt(blocks, px(10 * 60) - 1)).toBeNull()
  })
})
