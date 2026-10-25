import { describe, expect, it } from 'vitest'
import {
  isDevClockDeployment,
  isValidClockOffset,
  resolveDevClockOffset,
  withDevClockOffset,
} from './util'

const HOUR = 60 * 60 * 1000

describe('resolveDevClockOffset', () => {
  it('applies the stored offset on a dev deployment', () => {
    expect(resolveDevClockOffset(true, 2 * HOUR)).toBe(2 * HOUR)
  })

  it('ignores the stored offset on production', () => {
    expect(resolveDevClockOffset(false, 2 * HOUR)).toBe(0)
  })
})

describe('withDevClockOffset', () => {
  it('moves real now forward and back by the offset', () => {
    const now = Date.UTC(2026, 5, 15, 10, 0, 0)
    expect(withDevClockOffset(now, 90 * 60_000)).toBe(now + 90 * 60_000)
    expect(withDevClockOffset(now, -90 * 60_000)).toBe(now - 90 * 60_000)
  })

  it('leaves now untouched at zero', () => {
    const now = Date.UTC(2026, 5, 15, 10, 0, 0)
    expect(withDevClockOffset(now, 0)).toBe(now)
  })
})

describe('isDevClockDeployment', () => {
  it('is only on where the dev auth bypass is on', () => {
    expect(isDevClockDeployment(true)).toBe(true)
    expect(isDevClockDeployment(false)).toBe(false)
  })
})

describe('isValidClockOffset', () => {
  it('accepts whole milliseconds only', () => {
    expect(isValidClockOffset(0)).toBe(true)
    expect(isValidClockOffset(-HOUR)).toBe(true)
    expect(isValidClockOffset(1.5)).toBe(false)
    expect(isValidClockOffset(Number.NaN)).toBe(false)
  })
})
