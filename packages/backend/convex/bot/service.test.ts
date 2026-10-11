import { describe, expect, it } from 'vitest'
import { getStudyTransition } from './service'

const STUDY = ['chan-study', 'chan-study-2']

describe('getStudyTransition', () => {
  it('enters when moving from outside into a study channel', () => {
    expect(getStudyTransition(STUDY, { fromChannelId: null, toChannelId: 'chan-study' })).toEqual({
      kind: 'enter',
      channelId: 'chan-study',
    })
  })

  it('enters when moving from a non-study channel into a study channel', () => {
    expect(
      getStudyTransition(STUDY, { fromChannelId: 'chan-other', toChannelId: 'chan-study' })
    ).toEqual({ kind: 'enter', channelId: 'chan-study' })
  })

  it('leaves when moving from a study channel to outside', () => {
    expect(getStudyTransition(STUDY, { fromChannelId: 'chan-study', toChannelId: null })).toEqual({
      kind: 'leave',
    })
  })

  it('leaves when moving from a study channel to a non-study channel', () => {
    expect(
      getStudyTransition(STUDY, { fromChannelId: 'chan-study', toChannelId: 'chan-other' })
    ).toEqual({ kind: 'leave' })
  })

  it('is a no-op when moving between two study channels', () => {
    expect(
      getStudyTransition(STUDY, { fromChannelId: 'chan-study', toChannelId: 'chan-study-2' })
    ).toEqual({ kind: 'none' })
  })

  it('is a no-op when moving between two non-study channels', () => {
    expect(
      getStudyTransition(STUDY, { fromChannelId: 'chan-other', toChannelId: 'chan-other-2' })
    ).toEqual({ kind: 'none' })
  })

  it('is a no-op when disconnecting without being in study', () => {
    expect(getStudyTransition(STUDY, { fromChannelId: null, toChannelId: null })).toEqual({
      kind: 'none',
    })
  })
})
