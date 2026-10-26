import { describe, expect, it } from 'vitest'
import { describeVoiceMove, hasHumanInVoice, toVoiceSnapshot } from './voice'

describe('toVoiceSnapshot', () => {
  it('maps selfVideo to camera and streaming to screenShare', () => {
    expect(toVoiceSnapshot({ channelId: 'chan-a', selfVideo: true, streaming: false })).toEqual({
      channelId: 'chan-a',
      camera: true,
      screenShare: false,
    })
  })

  it('is all-off outside a channel', () => {
    expect(toVoiceSnapshot({ channelId: null, selfVideo: false, streaming: false })).toEqual({
      channelId: null,
      camera: false,
      screenShare: false,
    })
  })
})

describe('describeVoiceMove', () => {
  it('reports joining when going from no channel into one', () => {
    expect(describeVoiceMove(null, 'voice-1')).toBe('joined')
  })

  it('reports leaving when going from a channel to none', () => {
    expect(describeVoiceMove('voice-1', null)).toBe('left')
  })

  it('reports a move between two channels', () => {
    expect(describeVoiceMove('voice-1', 'voice-2')).toBe('moved')
  })

  it('reports nothing when the channel is unchanged', () => {
    expect(describeVoiceMove('voice-1', 'voice-1')).toBe('none')
    expect(describeVoiceMove(null, null)).toBe('none')
  })
})

describe('hasHumanInVoice', () => {
  const human = (channelId: string | null) => ({ channelId, member: { user: { bot: false } } })
  const bot = (channelId: string) => ({ channelId, member: { user: { bot: true } } })

  it('is false when the room is empty', () => {
    expect(hasHumanInVoice([])).toBe(false)
  })

  it('is false when everyone cached is disconnected', () => {
    expect(hasHumanInVoice([human(null), human(null)])).toBe(false)
  })

  it('is true when one person is in a channel', () => {
    expect(hasHumanInVoice([human(null), human('voice-1')])).toBe(true)
  })

  it('ignores bots', () => {
    expect(hasHumanInVoice([bot('voice-1')])).toBe(false)
  })
})
