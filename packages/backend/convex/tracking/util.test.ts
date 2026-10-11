import { describe, expect, it } from 'vitest'
import { decideManualStart } from './util'

describe('decideManualStart', () => {
  it('starts when nothing is active', () => {
    expect(decideManualStart(null)).toBe('start')
  })

  it('rejects a second manual start while already tracking', () => {
    expect(decideManualStart('manual')).toBe('reject-tracking')
  })

  it('rejects while any Discord voice mode is active', () => {
    for (const mode of ['voice', 'camera', 'screenShare', 'cameraAndScreenShare'] as const) {
      expect(decideManualStart(mode)).toBe('reject-on-discord')
    }
  })
})
