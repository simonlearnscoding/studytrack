import { describe, expect, it } from 'vitest'
import type { TimelineRowVM } from './types'
import { nightBands } from './bands'
import { resolveWindow } from './util'

const FLOOR_PX = 608
const PX_PER_HOUR = 32

const row = (hiddenCount: number): TimelineRowVM => ({
  key: 'k',
  name: 'name',
  image: null,
  you: false,
  live: false,
  tail: '—',
  bars: [],
  plans: [],
  planBlocks: [],
  dots: [],
  hiddenCount,
})

describe('nightBands', () => {
  it('places the collapsed band at the axis start', () => {
    const axis = resolveWindow({ nowMin: 12 * 60, availablePx: FLOOR_PX })
    const { bands, hidden } = nightBands(axis, [row(2), row(1)])
    expect(bands).toHaveLength(1)
    expect(bands[0]).toMatchObject({
      offsetPx: 0,
      segment: { kind: 'band', startMin: 0, endMin: 6 * 60, collapsed: true },
    })
    expect(hidden).toBe(3)
  })

  it('reports the band at real scale once it is expanded', () => {
    const axis = resolveWindow({
      nowMin: 12 * 60,
      availablePx: FLOOR_PX,
      expansion: { morning: true },
    })
    const { bands } = nightBands(axis, [])
    expect(bands[0].segment).toMatchObject({
      collapsed: false,
      widthPx: 6 * PX_PER_HOUR,
    })
  })
})
