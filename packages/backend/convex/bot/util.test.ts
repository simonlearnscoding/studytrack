import { describe, expect, it } from 'vitest'
import { getStudyMode, getVoiceTransition } from './util'
import type { VoiceSnapshot } from './types'

function snap(overrides: Partial<VoiceSnapshot> = {}): VoiceSnapshot {
  return { channelId: null, camera: false, screenShare: false, ...overrides }
}

describe('getStudyMode', () => {
  it('is voice when neither camera nor screen share is on', () => {
    expect(getStudyMode(snap())).toBe('voice')
  })

  it('is camera when only the camera is on', () => {
    expect(getStudyMode(snap({ camera: true }))).toBe('camera')
  })

  it('is screenShare when only screen share is on', () => {
    expect(getStudyMode(snap({ screenShare: true }))).toBe('screenShare')
  })

  it('is cameraAndScreenShare when both are on', () => {
    expect(getStudyMode(snap({ camera: true, screenShare: true }))).toBe('cameraAndScreenShare')
  })
})

describe('getVoiceTransition', () => {
  it('enters when joining a voice channel from outside', () => {
    expect(getVoiceTransition(snap(), snap({ channelId: 'chan-a' }))).toBe('enter')
  })

  it('leaves when going from a voice channel to outside', () => {
    expect(getVoiceTransition(snap({ channelId: 'chan-a' }), snap())).toBe('leave')
  })

  it('is none when the channel and mode are unchanged', () => {
    expect(getVoiceTransition(snap({ channelId: 'chan-a' }), snap({ channelId: 'chan-a' }))).toBe(
      'none'
    )
    expect(getVoiceTransition(snap(), snap())).toBe('none')
  })

  it('changes when moving between channels', () => {
    expect(getVoiceTransition(snap({ channelId: 'chan-a' }), snap({ channelId: 'chan-b' }))).toBe(
      'change'
    )
  })

  it('changes when turning the camera on without moving', () => {
    expect(
      getVoiceTransition(snap({ channelId: 'chan-a' }), snap({ channelId: 'chan-a', camera: true }))
    ).toBe('change')
  })

  it('changes when turning screen share off without moving', () => {
    expect(
      getVoiceTransition(
        snap({ channelId: 'chan-a', screenShare: true }),
        snap({ channelId: 'chan-a' })
      )
    ).toBe('change')
  })
})
