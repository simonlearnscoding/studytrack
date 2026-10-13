import { describe, expect, it } from 'vitest'
import { overlapMs } from './util'

const H = 60 * 60 * 1000

describe('overlapMs', () => {
  it('returns the full interval when it sits inside the window', () => {
    expect(overlapMs(1 * H, 2 * H, 0, 3 * H)).toBe(1 * H)
  })

  it('clips the start to the window', () => {
    expect(overlapMs(0, 2 * H, 1 * H, 3 * H)).toBe(1 * H)
  })

  it('clips the end to the window', () => {
    expect(overlapMs(1 * H, 4 * H, 0, 2 * H)).toBe(1 * H)
  })

  it('returns the window when the interval covers it', () => {
    expect(overlapMs(0, 5 * H, 1 * H, 2 * H)).toBe(1 * H)
  })

  it('is zero when the intervals only touch', () => {
    expect(overlapMs(0, 1 * H, 1 * H, 2 * H)).toBe(0)
  })

  it('is zero when the intervals are disjoint', () => {
    expect(overlapMs(0, 1 * H, 2 * H, 3 * H)).toBe(0)
  })

  it('is zero for a zero-length interval', () => {
    expect(overlapMs(1 * H, 1 * H, 0, 2 * H)).toBe(0)
  })
})
